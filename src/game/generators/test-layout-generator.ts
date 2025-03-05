import { ChunkMetadata, Direction, RoadType, RoadWeight } from './layout-generator';
import { StagedLayoutGenerator } from './staged-layout-generator';

export class TestLayoutGenerator extends StagedLayoutGenerator {
    constructor() {
        // Initialize with a 4x4 grid
        super(3, 3);
    }

    generate(): ChunkMetadata[][] {
        // Reset the layout to empty state
        this.layout = Array(4).fill(null).map(() => 
            Array(4).fill(null).map(() => ({ type: 'building' as const }))
        );

        // Row 0: Straight roads
        // this.placeRoad(0, 0, 'trunk', 'straight', 0);  // Vertical
        // this.placeRoad(1, 0, 'medium', 'straight', 1); // Horizontal
        // this.placeRoad(2, 0, 'minor', 'straight', 0);  // Vertical
        // this.placeRoad(3, 0, 'trunk', 'straight', 1);  // Horizontal

        // Row 1: Turns
        // this.placeRoad(0, 1, 'trunk', 'turn', 0);   // SE turn
        // this.placeRoad(1, 1, 'medium', 'turn', 1);  // SW turn
        // this.placeRoad(2, 1, 'minor', 'turn', 2);   // NW turn
        // this.placeRoad(3, 1, 'trunk', 'turn', 3);   // NE turn

        // Row 2: T-intersections
        // this.placeRoad(0, 2, 'trunk', 'intersection', 0);   // Facing S
        // this.placeRoad(1, 2, 'medium', 'intersection', 1);  // Facing W
        // this.placeRoad(2, 2, 'minor', 'intersection', 2);   // Facing N
        // this.placeRoad(3, 2, 'trunk', 'intersection', 3);   // Facing E

        // Row 3: Dead ends
        // this.placeRoad(0, 3, 'trunk', 'deadend', 0);   // Facing S
        // this.placeRoad(1, 3, 'medium', 'deadend', 1);  // Facing W
        // this.placeRoad(2, 3, 'minor', 'deadend', 2);   // Facing N
        // this.placeRoad(3, 3, 'trunk', 'deadend', 3);   // Facing E

        this.placeRoad(1, 1, 'medium', 'intersection', 0);
        this.placeRoad(0, 1, 'medium', 'straight', 1);
        this.placeRoad(2, 1, 'medium', 'straight', 1);
        this.placeRoad(1, 0, 'medium', 'straight', 1);
        this.placeRoad(1, 2, 'medium', 'straight', 1);

        // Process connections
        this.processAllRoadConnections();

        return this.layout;
    }

    protected placeRoad(x: number, y: number, weight: RoadWeight, type: RoadType, orientation: number): void {
        if (!this.isValidPosition(x, y)) return;
        
        this.layout[y][x] = {
            type: 'road',
            roadInfo: {
                type,
                weight,
                orientation,
                connections: [] // Will be updated by processRoadConnections
            }
        };
    }
} 