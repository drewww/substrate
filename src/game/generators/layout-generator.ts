export interface ChunkMetadata {
    type: 'road' | 'building';
}

interface Agent {
    x: number;
    y: number;
    direction: number; // 0=north, 1=east, 2=south, 3=west
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
    private readonly TARGET_ROAD_PERCENTAGE = 0.7;
    private readonly DIRECTIONS = [
        [0, -1], // north
        [1, 0],  // east
        [0, 1],  // south
        [-1, 0]  // west
    ];
    private readonly STRAIGHT_BIAS = 0.7; // 70% chance to go straight if possible

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.reset();
    }

    private reset(): void {
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
        // Start in center
        this.agent = {
            x: Math.floor(this.width/2),
            y: Math.floor(this.height/2),
            direction: 0
        };
        this.layout[this.agent.y][this.agent.x] = { type: 'road' as const };
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
        
        // Check all road tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.layout[y][x].type !== 'road') continue;

                // Find the direction this road came from (if possible)
                let sourceDirection = -1;
                for (let dir = 0; dir < this.DIRECTIONS.length; dir++) {
                    const prevX = x - this.DIRECTIONS[dir][0];
                    const prevY = y - this.DIRECTIONS[dir][1];
                    if (prevX >= 0 && prevX < this.width && 
                        prevY >= 0 && prevY < this.height &&
                        this.layout[prevY][prevX].type === 'road') {
                        sourceDirection = dir;
                        break;
                    }
                }

                // Check adjacent tiles
                for (let dir = 0; dir < this.DIRECTIONS.length; dir++) {
                    const [dx, dy] = this.DIRECTIONS[dir];
                    const newX = x + dx;
                    const newY = y + dy;
                    
                    if (this.isValidExpansionTile(newX, newY)) {
                        if (!this.wouldCreateRoadBlock(newX, newY)) {
                            // If we found a source direction, check if this would be "straight"
                            const isStraight = sourceDirection !== -1 && 
                                ((sourceDirection + 2) % 4 !== dir); // Not going backwards
                                
                            openTiles.push({
                                x: newX,
                                y: newY,
                                sourceRoadX: x,
                                sourceRoadY: y,
                                direction: dir,
                                isStraight: isStraight
                            });
                        }
                    }
                }
            }
        }
        return openTiles;
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

                // Try to find a straight path
                const straightPaths = validBranchPoints.filter(tile => tile.isStraight);
                
                if (straightPaths.length > 0 && Math.random() < this.STRAIGHT_BIAS) {
                    // Pick a random straight path
                    branchPoint = straightPaths[Math.floor(Math.random() * straightPaths.length)];
                } else {
                    // Pick any valid branch point
                    branchPoint = validBranchPoints[Math.floor(Math.random() * validBranchPoints.length)];
                }
                
                // Create new road at branch point
                this.layout[branchPoint.y][branchPoint.x] = { type: 'road' as const };
                
                // Set agent to new position with the chosen direction
                this.agent = {
                    x: branchPoint.x,
                    y: branchPoint.y,
                    direction: branchPoint.direction
                };
                
                return true;
            }
        }
        
        return false;
    }

    generate(): ChunkMetadata[][] {
        this.reset();
        while (this.step()) {}
        return this.layout;
    }

    getCurrentLayout(): ChunkMetadata[][] {
        return this.layout;
    }
}

