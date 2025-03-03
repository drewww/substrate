import { Display } from '../../display/display';
import { ChunkMetadata } from './layout-generator';

export class LayoutRenderer {
    constructor(private display: Display) {}

    renderLayout(layout: ChunkMetadata[][]): void {
        // Clear the display
        this.display.clear();

        // Render each cell based on its metadata
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                const metadata = layout[y][x];
                
                switch (metadata.type) {
                    case 'road':
                        this.display.createTile(
                            x,
                            y,
                            '.',
                            '#666666',
                            '#333333'
                        );
                        break;
                    case 'building':
                        this.display.createTile(
                            x,
                            y,
                            '#',
                            '#888888',
                            '#444444'
                        );
                        break;
                }
            }
        }
    }
} 