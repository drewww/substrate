export interface ChunkMetadata {
    type: 'road' | 'building';
}
export class LayoutGenerator {
    private width: number;
    private height: number;
    private layout: ChunkMetadata[][];
    private stepsRemaining: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.stepsRemaining = 15; // Number of roads to place
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
    }

    step(): boolean {
        if (this.stepsRemaining <= 0) {
            // Fill remaining spaces with buildings
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    if (!this.layout[y][x]) {
                        this.layout[y][x] = { type: 'building' as const };
                    }
                }
            }
            return false; // Generation complete
        }

        // Place one random road
        const x = Math.floor(Math.random() * this.width);
        const y = Math.floor(Math.random() * this.height);
        this.layout[y][x] = { type: 'road' as const };
        this.stepsRemaining--;

        return true; // More steps available
    }

    generate(): ChunkMetadata[][] {
        // Reset state
        this.stepsRemaining = 15;
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );

        // Run all steps
        while (this.step()) {}

        return this.layout;
    }

    getCurrentLayout(): ChunkMetadata[][] {
        return this.layout;
    }
}

