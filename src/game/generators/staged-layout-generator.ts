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
        this.startX = Math.floor(Math.random() * (this.width - 6)) + 3;
        this.startY = Math.floor(Math.random() * (this.height - 6)) + 3;
        
        // Start with first direction (north)
        this.currentDirection = 0;
        this.currentLength = 0;
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

    step(): boolean {
        if (this.currentPhase !== 'trunk') {
            return false;
        }

        // Place current road
        this.placeRoad(this.startX, this.startY, 'trunk');
        
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
                
                if (Math.random() > continueChance) {
                    // End this trunk
                    this.currentDirection = (this.currentDirection + 1) % 4;
                    this.currentLength = 0;
                    return true;
                }
            }
            
            // Move to next position
            this.startX = nextX;
            this.startY = nextY;
            return true;
        } else {
            // We hit an edge
            this.handleEdgeIntersection(this.startX, this.startY);
            return true;
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