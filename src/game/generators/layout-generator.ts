export type RoadWeight = 'trunk' | 'medium' | 'minor';
export type RoadType = 'straight' | 'turn' | 'intersection' | 'deadend' | 'unknown';
export type Direction = 'north' | 'east' | 'south' | 'west';

export interface ChunkMetadata {
    type: 'road' | 'building';
    roadInfo?: {
        type: RoadType;
        weight: RoadWeight;
        connections: Direction[];  // Which directions have roads
        orientation?: number;      // 0 = N/S, 1 = E/W, 2 = S/N, 3 = W/E
    };
}

interface Agent {
    x: number;
    y: number;
    direction: number;
    weight: RoadWeight; // Track current road weight being built
}

interface OpenTile {
    x: number;
    y: number;
    sourceRoadX: number;
    sourceRoadY: number;
    direction: number;  // Add direction to track which way this branch would go
    isStraight: boolean;  // Flag if this continues the previous direction
}

export class LayoutGenerator {
    private width: number;
    private height: number;
    private layout!: ChunkMetadata[][];
    private agent!: Agent;
    private readonly TARGET_ROAD_PERCENTAGE = 0.7; // Lower overall target since trunks will be longer
    private readonly TRUNK_CONTINUE_BIAS = 0.95;   // Very high chance to continue trunk roads
    private readonly STRAIGHT_BIAS = 0.7;          // For non-trunk roads
    private readonly TRUNK_LENGTH_MIN = 8;         // Minimum length for trunk roads
    private readonly DIRECTIONS = [
        [0, -1], // north
        [1, 0],  // east
        [0, 1],  // south
        [-1, 0]  // west
    ];
    private readonly TRUNK_BRANCH_CHANCE = 0.15; // Chance to start a medium road from trunk
    private readonly MEDIUM_BRANCH_CHANCE = 0.3; // Chance to start a minor road from medium

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.reset();
    }

    private reset(): void {
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
        
        // Start in center with a trunk road
        const centerX = Math.floor(this.width/2);
        const centerY = Math.floor(this.height/2);
        
        this.agent = {
            x: centerX,
            y: centerY,
            direction: 0,
            weight: 'trunk'
        };
        
        // Initialize the first road with proper roadInfo
        this.layout[centerY][centerX] = { 
            type: 'road',
            roadInfo: {
                type: 'deadend',
                weight: 'trunk',
                connections: [] // Will be updated in postProcess
            }
        };
    }

    private getRoadPercentage(): number {
        let roadCount = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.layout[y][x].type === 'road') roadCount++;
            }
        }
        return roadCount / (this.width * this.height);
    }

    private findValidBranchPoints(): OpenTile[] {
        const openTiles: OpenTile[] = [];
        
        // First, check if current agent is building a trunk road
        if (this.agent.weight === 'trunk') {
            // Get the straight-ahead position
            const [dx, dy] = this.DIRECTIONS[this.agent.direction];
            const newX = this.agent.x + dx;
            const newY = this.agent.y + dy;
            
            // If we can continue straight and haven't reached map edge
            if (this.isValidExpansionTile(newX, newY)) {
                openTiles.push({
                    x: newX,
                    y: newY,
                    sourceRoadX: this.agent.x,
                    sourceRoadY: this.agent.y,
                    direction: this.agent.direction,
                    isStraight: true
                });
                
                // For trunk roads, strongly prefer continuing straight
                if (Math.random() < this.TRUNK_CONTINUE_BIAS) {
                    return openTiles;
                }
            }
        }

        // If not continuing a trunk road, find all possible branches
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (cell.type !== 'road' || !cell.roadInfo) continue;

                // Start new trunk roads less frequently but make them go far
                if (cell.roadInfo.weight === 'trunk') {
                    if (Math.random() > 0.1) continue; // Only 10% chance to branch from trunk
                }

                // Regular branch point finding logic...
                for (let dir = 0; dir < this.DIRECTIONS.length; dir++) {
                    const [dx, dy] = this.DIRECTIONS[dir];
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (this.isValidExpansionTile(newX, newY)) {
                        if (!this.wouldCreateRoadBlock(newX, newY)) {
                            const isStraight = this.isStraightContinuation(x, y, dir);
                            openTiles.push({
                                x: newX,
                                y: newY,
                                sourceRoadX: x,
                                sourceRoadY: y,
                                direction: dir,
                                isStraight
                            });
                        }
                    }
                }
            }
        }
        return openTiles;
    }

    private isStraightContinuation(x: number, y: number, direction: number): boolean {
        // Check if this would continue in the same direction as the source road
        const cell = this.layout[y][x];
        if (!cell.roadInfo || cell.roadInfo.connections.length !== 2) return false;
        
        // For trunk roads, only consider straight continuations
        if (cell.roadInfo.weight === 'trunk') {
            return (direction % 2) === (this.agent.direction % 2);
        }
        
        return true;
    }

    private wouldCreateRoadBlock(x: number, y: number): boolean {
        // Check all possible 2x2 blocks this tile could be part of
        for (let offsetY = -1; offsetY <= 0; offsetY++) {
            for (let offsetX = -1; offsetX <= 0; offsetX++) {
                // Check if this 2x2 block would be all roads
                let allRoads = true;
                
                // Check each position in the 2x2 block
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const checkX = x + offsetX + dx;
                        const checkY = y + offsetY + dy;
                        
                        // If any position is out of bounds or not a road, this block is okay
                        if (checkX < 0 || checkX >= this.width || 
                            checkY < 0 || checkY >= this.height) {
                            allRoads = false;
                            break;
                        }
                        
                        // Check if this position would be a road
                        // (either it already is, or it's the position we're checking)
                        if (checkX === x && checkY === y) continue; // This would be a road
                        if (this.layout[checkY][checkX].type !== 'road') {
                            allRoads = false;
                            break;
                        }
                    }
                    if (!allRoads) break;
                }
                
                // If we found a 2x2 block that would be all roads, return true
                if (allRoads) return true;
            }
        }
        
        return false;
    }

    private isValidExpansionTile(x: number, y: number): boolean {
        // Check bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        
        // Must be a building (not already a road)
        if (this.layout[y][x].type !== 'road') {
            // Must have exactly one adjacent road
            let adjacentRoads = 0;
            for (const [dx, dy] of this.DIRECTIONS) {
                const checkX = x + dx;
                const checkY = y + dy;
                if (checkX >= 0 && checkX < this.width && 
                    checkY >= 0 && checkY < this.height) {
                    if (this.layout[checkY][checkX].type === 'road') {
                        adjacentRoads++;
                    }
                }
            }
            
            // Check if this would create a 2x2 road block
            if (adjacentRoads === 1 && !this.wouldCreateRoadBlock(x, y)) {
                return true;
            }
        }
        
        return false;
    }

    step(): boolean {
        if (this.getRoadPercentage() < this.TARGET_ROAD_PERCENTAGE) {
            const validBranchPoints = this.findValidBranchPoints();
            
            if (validBranchPoints.length > 0) {
                let branchPoint: OpenTile;
                
                // For trunk roads, always take the straight option if available
                if (this.agent.weight === 'trunk') {
                    const straightOption = validBranchPoints.find(p => p.isStraight);
                    if (straightOption) {
                        branchPoint = straightOption;
                    } else {
                        branchPoint = validBranchPoints[Math.floor(Math.random() * validBranchPoints.length)];
                    }
                } else {
                    // Existing branching logic for non-trunk roads...
                    if (Math.random() < this.STRAIGHT_BIAS) {
                        const straightPaths = validBranchPoints.filter(tile => tile.isStraight);
                        if (straightPaths.length > 0) {
                            branchPoint = straightPaths[Math.floor(Math.random() * straightPaths.length)];
                        } else {
                            branchPoint = validBranchPoints[Math.floor(Math.random() * validBranchPoints.length)];
                        }
                    } else {
                        branchPoint = validBranchPoints[Math.floor(Math.random() * validBranchPoints.length)];
                    }
                }

                // Create new road at branch point
                this.layout[branchPoint.y][branchPoint.x] = {
                    type: 'road',
                    roadInfo: {
                        type: 'straight',
                        weight: this.agent.weight,
                        connections: []
                    }
                };
                
                this.agent = {
                    x: branchPoint.x,
                    y: branchPoint.y,
                    direction: branchPoint.direction,
                    weight: this.agent.weight
                };
                
                return true;
            }
        }
        
        this.postProcess();
        return false;
    }

    private postProcess(): void {
        // First pass - identify trunk roads (straight lines from center)
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.layout[y][x].type === 'road') {
                    // Find connected roads
                    const connections: Direction[] = [];
                    if (y > 0 && this.layout[y-1][x].type === 'road') connections.push('north');
                    if (x < this.width-1 && this.layout[y][x+1].type === 'road') connections.push('east');
                    if (y < this.height-1 && this.layout[y+1][x].type === 'road') connections.push('south');
                    if (x > 0 && this.layout[y][x-1].type === 'road') connections.push('west');

                    let roadType: RoadType;
                    switch (connections.length) {
                        case 1: roadType = 'deadend'; break;
                        case 2:
                            roadType = (connections.includes('north') && connections.includes('south')) ||
                                     (connections.includes('east') && connections.includes('west')) 
                                     ? 'straight' : 'turn';
                            break;
                        case 3:
                        case 4: roadType = 'intersection'; break;
                        default: roadType = 'deadend';
                    }

                    // Determine weight - for now, just make straight roads from center trunk roads
                    let weight: RoadWeight = 'minor';
                    if (x === centerX || y === centerY) {
                        weight = 'trunk';
                    } else if (Math.abs(x - centerX) <= 1 || Math.abs(y - centerY) <= 1) {
                        weight = 'medium';
                    }

                    this.layout[y][x].roadInfo = {
                        type: roadType,
                        weight,
                        connections
                    };
                }
            }
        }
    }

    generate(): ChunkMetadata[][] {
        this.reset();
        while (this.step()) {}
        this.postProcess();
        return this.layout;
    }

    getCurrentLayout(): ChunkMetadata[][] {
        return this.layout;
    }

    private getRoadSymbol(connections: Direction[], weight: RoadWeight): string {
        const sortedKey = [...connections].sort().join(',');
        
        // Map of road configurations to symbols, with weight variations
        const symbolMap: Record<string, Record<RoadWeight, string>> = {
            'north,south': {
                trunk: '┃',
                medium: '│',
                minor: '╎'
            },
            'east,west': {
                trunk: '━',
                medium: '─',
                minor: '╌'
            },
            // Add more configurations with weight-specific symbols
            'east,north,south,west': {
                trunk: '╋',
                medium: '┼',
                minor: '┽'
            },
            // ... add other configurations ...
        };

        return symbolMap[sortedKey]?.[weight] ?? '○';
    }
}

