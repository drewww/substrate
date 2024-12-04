import { BaseTest } from './base-test';
import { Color, TileId } from '../../types';

export class SmallPixelTest extends BaseTest {
    private tileIds: TileId[] = [];

    constructor() {
        super({
            worldWidth: 100,
            worldHeight: 100,
            viewportWidth: 100,
            viewportHeight: 100,
            cellWidth: 2,    // 2px wide cells
            cellHeight: 2,   // 2px tall cells
        });
    }

    getName(): string {
        return "small-pixel";
    }

    getDescription(): string {
        return "Tests display with 2x2 pixel cells";
    }

    protected run(): void {
        // Start with a simple checkerboard pattern
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isEven = (x + y) % 2 === 0;
                const tileId = this.display.createTile(
                    x,
                    y,
                    ' ',  // No character needed for pixels
                    '#00000000',  // Transparent foreground
                    isEven ? '#FF0000FF' : '#0000FFFF',  // Red/Blue checkerboard
                    1
                );
                this.tileIds.push(tileId);
            }
        }
    }

    protected cleanup(): void {
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
    }
} 