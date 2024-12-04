import { Tile } from "./types";
import { logger } from "./util/logger";

export class DirtyMask {
    private mask: boolean[][];

    constructor(
        private readonly width: number,
        private readonly height: number
    ) {
        this.mask = Array(height).fill(0)
            .map(() => Array(width).fill(false));
    }

    public markDirty(tile: Tile) {

        if(tile.x !== Math.floor(tile.x) || tile.y !== Math.floor(tile.y)) {
            logger.warn(`Marking non-integer tile ${tile.x},${tile.y} as dirty`);

            // compute the bounding box of the tile 
        }


        if (tile.x >= 0 && tile.x < this.width && 
            tile.y >= 0 && tile.y < this.height) {
            logger.debug(`Marking tile ${tile.x},${tile.y} as dirty`);
            this.mask[tile.y][tile.x] = true;
        }
    }

    public clear() {
        this.mask = this.mask.map(row => row.fill(false));
    }

    public isDirty(x: number, y: number): boolean {
        return this.mask[y][x];
    }

    public hasDirtyTiles(): boolean {
        return this.mask.some(row => row.some(cell => cell));
    }

    // For debug visualization
    public getMask(): readonly boolean[][] {
        return this.mask;
    }
} 