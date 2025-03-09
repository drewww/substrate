import { StagedLayoutGenerator } from './staged-layout-generator';
import { ChunkMetadata } from './layout-generator';

export class SimpleLayoutGenerator extends StagedLayoutGenerator {
    constructor() {
        super(4, 4); // Always 4x4
    }

    generate(): ChunkMetadata[][] {
        // Initialize all tiles as buildings
        this.layout = Array(4).fill(null).map(() => 
            Array(4).fill(null).map(() => ({ type: 'building' as const }))
        );

        // Create vertical medium road in column 1
        for (let y = 0; y < 4; y++) {
            this.placeRoad(1, y, 'medium', 'straight', 2); // orientation 2 for vertical
        }

        // Create horizontal minor road in row 2
        for (let x = 0; x < 4; x++) {
            if (x !== 1) { // Skip intersection point
                this.placeRoad(x, 2, 'minor', 'straight', 1); // orientation 1 for horizontal
            }
        }

        // Process the intersection
        this.placeRoad(1, 2, 'medium', 'intersection', 0);

        // Process all road connections to ensure proper road types
        this.processAllRoadConnections();

        return this.layout;
    }
} 