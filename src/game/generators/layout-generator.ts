export interface ChunkMetadata {
    type: 'road' | 'building';
}
export class LayoutGenerator {
    private width: number;
    private height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    generate(): ChunkMetadata[][] {
        // Create a fresh layout each time
        const layout: ChunkMetadata[][] = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );

        // Place 15 random roads
        for (let i = 0; i < 15; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            layout[y][x] = { type: 'road' as const };
        }

        // Fill remaining spaces with buildings
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (!layout[y][x]) {
                    layout[y][x] = { type: 'building' as const };
                }
            }
        }

        return layout;
    }
}

