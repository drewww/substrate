import { ChunkMetadata, Direction, RoadType, RoadWeight } from './layout-generator';

export class StagedLayoutGenerator {
    private width: number;
    private height: number;
    private layout!: ChunkMetadata[][];
    private readonly DIRECTIONS = [
        [0, -1], // North
        [1, 0],  // East
        [0, 1],  // South
        [-1, 0]  // West
    ];
    
    // Phase tracking
    private currentPhase: 'trunk' | 'medium' | 'minor' = 'trunk';
    private startX: number = 0;
    private startY: number = 0;
    private currentDirection: number = 0;
    private currentLength: number = 0;
    private readonly MIN_TRUNK_LENGTH = 6;
    private readonly TRUNK_CONTINUE_CHANCE = 0.95; // Base chance to continue
    private readonly TRUNK_CONTINUE_DECREASE = 0.02; // Increase per tile beyond 4

    // Add these new properties
    private readonly MAX_TRUNK_TILES = 100;
    private trunkTilesPlaced = 0;
    private unexploredDirections: number[] = [0, 1, 2, 3]; // Cardinal directions to explore from origin
    private originX: number = 0;
    private originY: number = 0;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.reset();
    }

    private reset(): void {
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
        
        // Choose a random starting point (not within 2 of an edge)
        this.originX = Math.floor(Math.random() * (this.width - 6)) + 3;
        this.originY = Math.floor(Math.random() * (this.height - 6)) + 3;
        
        // Reset all tracking variables
        this.startX = this.originX;
        this.startY = this.originY;
        this.currentDirection = 0;
        this.currentLength = 0;
        this.trunkTilesPlaced = 0;
        this.unexploredDirections = [0, 1, 2, 3];
        
        // Place the origin point
        this.placeRoad(this.originX, this.originY, 'trunk');
        this.trunkTilesPlaced++;
    }

    private placeRoad(x: number, y: number, weight: RoadWeight): void {
        if (!this.isValidPosition(x, y)) return;
        
        this.layout[y][x] = {
            type: 'road',
            roadInfo: {
                type: 'straight', // Will be updated in postProcess
                weight: weight,
                connections: [] // Will be updated in postProcess
            }
        };
    }

    private isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    private isEdgeTile(x: number, y: number): boolean {
        return x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
    }

    private isCornerTile(x: number, y: number): boolean {
        return (x === 0 || x === this.width - 1) && (y === 0 || y === this.height - 1);
    }

    private handleEdgeIntersection(x: number, y: number): void {
        if (this.isCornerTile(x, y)) {
            // At a corner, follow the corner
            const nextDirection = (this.currentDirection + 1) % 4;
            this.currentDirection = nextDirection;
            this.currentLength = 0;
            return;
        }

        // At a regular edge, choose between T-intersection or turn
        if (Math.random() < 0.5) {
            // T-intersection
            const leftDir = (this.currentDirection + 3) % 4;
            const rightDir = (this.currentDirection + 1) % 4;
            const nextDir = Math.random() < 0.5 ? leftDir : rightDir;
            this.currentDirection = nextDir;
        } else {
            // Turn
            const turnDir = Math.random() < 0.5 ? 
                (this.currentDirection + 1) % 4 : // Turn right
                (this.currentDirection + 3) % 4;  // Turn left
            this.currentDirection = turnDir;
        }
        this.currentLength = 0;
    }

    // Add this helper method to check if a point is part of a straight trunk segment
    private isStraightTrunkSegment(x: number, y: number): boolean {
        const cell = this.layout[y][x];
        if (cell.type !== 'road' || !cell.roadInfo || cell.roadInfo.weight !== 'trunk') {
            return false;
        }

        // Check horizontal straight
        const isHorizontalStraight = 
            this.isRoadOfType(x - 1, y, 'trunk') && 
            this.isRoadOfType(x + 1, y, 'trunk') &&
            !this.isRoadOfType(x, y - 1, 'trunk') && 
            !this.isRoadOfType(x, y + 1, 'trunk');

        // Check vertical straight
        const isVerticalStraight = 
            this.isRoadOfType(x, y - 1, 'trunk') && 
            this.isRoadOfType(x, y + 1, 'trunk') &&
            !this.isRoadOfType(x - 1, y, 'trunk') && 
            !this.isRoadOfType(x + 1, y, 'trunk');

        return isHorizontalStraight || isVerticalStraight;
    }

    // Helper to check if a position has a road of specific weight
    private isRoadOfType(x: number, y: number, weight: RoadWeight): boolean {
        if (!this.isValidPosition(x, y)) return false;
        const cell = this.layout[y][x];
        return cell.type === 'road' && cell.roadInfo?.weight === weight;
    }

    // Modify startNewTrunk to consider all valid trunk points
    private startNewTrunk(): boolean {
        if (this.unexploredDirections.length === 0) {
            console.log('No more unexplored directions');
            return false;
        }

        // Collect all valid trunk points
        const validTrunkPoints: Array<{x: number, y: number}> = [];
        
        // Always include the origin
        validTrunkPoints.push({ x: this.originX, y: this.originY });
        
        // Find other valid trunk points
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isStraightTrunkSegment(x, y)) {
                    validTrunkPoints.push({ x, y });
                }
            }
        }

        console.log(`Found ${validTrunkPoints.length} valid trunk points`);
        
        // Pick a random valid trunk point
        const startPoint = validTrunkPoints[Math.floor(Math.random() * validTrunkPoints.length)];
        
        // Pick a random unexplored direction
        const dirIndex = Math.floor(Math.random() * this.unexploredDirections.length);
        this.currentDirection = this.unexploredDirections[dirIndex];
        
        // Remove this direction from unexplored list
        this.unexploredDirections.splice(dirIndex, 1);
        
        console.log(`Starting new trunk at (${startPoint.x}, ${startPoint.y}) in direction ${this.currentDirection}`);
        console.log(`Remaining unexplored directions: ${this.unexploredDirections.join(', ')}`);
        
        // Set position to chosen point and reset length counter
        this.startX = startPoint.x;
        this.startY = startPoint.y;
        this.currentLength = 0;
        
        return true;
    }

    step(): boolean {
        if (this.currentPhase !== 'trunk') {
            console.log('Ending: Not in trunk phase');
            return false;
        }
        
        if (this.trunkTilesPlaced >= this.MAX_TRUNK_TILES) {
            console.log(`Ending: Hit max trunk tiles (${this.trunkTilesPlaced}/${this.MAX_TRUNK_TILES})`);
            return false;
        }

        // Place current road
        this.placeRoad(this.startX, this.startY, 'trunk');
        this.trunkTilesPlaced++;
        
        console.log(`Placed trunk tile ${this.trunkTilesPlaced}/${this.MAX_TRUNK_TILES} at (${this.startX}, ${this.startY})`);
        console.log(`Current length: ${this.currentLength}, Direction: ${this.currentDirection}`);
        console.log(`Unexplored directions: ${this.unexploredDirections.join(', ')}`);
        
        // Calculate next position
        const nextX = this.startX + this.DIRECTIONS[this.currentDirection][0];
        const nextY = this.startY + this.DIRECTIONS[this.currentDirection][1];
        
        // Check if we should continue
        if (this.isValidPosition(nextX, nextY)) {
            this.currentLength++;
            
            // If we've reached minimum length, check if we should continue
            if (this.currentLength >= this.MIN_TRUNK_LENGTH) {
                const continueChance = this.TRUNK_CONTINUE_CHANCE -
                    (this.currentLength - 6) * this.TRUNK_CONTINUE_DECREASE;
                
                console.log(`Continue chance: ${continueChance} at length ${this.currentLength}`);
                
                if (Math.random() > continueChance) {
                    console.log('Failed continue check, starting new trunk');
                    // End this trunk and start a new one
                    return this.startNewTrunk();
                }
            }
            
            // Move to next position
            this.startX = nextX;
            this.startY = nextY;
            return true;
        } else {
            console.log(`Hit invalid position at (${nextX}, ${nextY}), handling edge`);
            // We hit an edge
            this.handleEdgeIntersection(this.startX, this.startY);
            
            // If we hit an edge, also start a new trunk
            return this.startNewTrunk();
        }
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