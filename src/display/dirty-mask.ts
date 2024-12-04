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

        const tilesToMark: {x: number, y: number}[] = [];

        if(tile.x !== Math.floor(tile.x) || tile.y !== Math.floor(tile.y)) {
            logger.warn(`Marking non-integer tile ${tile.x},${tile.y} as dirty`);

            // compute the bounding box of the tile using the acutal width and height of the tile
            // intersect that bounding box with the dirty mask and mark any tile x/y combos that it intersects at all.
            let minX = Math.max(tile.x, Math.floor(tile.x));
            let maxX = Math.min(tile.x + 1, Math.ceil(tile.x + 1));
            let minY = Math.max(tile.y, Math.floor(tile.y)); 
            let maxY = Math.min(tile.y + 1, Math.ceil(tile.y + 1));

            if(tile.noClip) {
                // if no clip, expand the bounding box one tile in every direction.
                minX -= 1;
                maxX += 1;
                minY -= 1;
                maxY += 1;
            }

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    logger.debug(`Marking tile ${x},${y} as dirty due to non-integer tile`);
                    tilesToMark.push({x: Math.floor(x), y: Math.floor(y)});
                }
            } 
        } else {
            tilesToMark.push({x: tile.x, y: tile.y});
        }
        
        for (const {x, y} of tilesToMark) {
            if (x >= 0 && x < this.width && 
                y >= 0 && y < this.height) {
                logger.debug(`Marking tile ${x},${y} as dirty`);
                this.mask[y][x] = true;
            }
        }
    }

    public clear() {
        this.mask = this.mask.map(row => row.fill(false));
    }

    public isDirty(x: number, y: number): boolean {
        return this.mask[Math.floor(y)][Math.floor(x)];
    }

    public hasDirtyTiles(): boolean {
        return this.mask.some(row => row.some(cell => cell));
    }

    // For debug visualization
    public getMask(): readonly boolean[][] {
        return this.mask;
    }
} 