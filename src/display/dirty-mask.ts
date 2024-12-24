import { Tile } from "./types";

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

        if(tile.x !== Math.floor(tile.x) || tile.y !== Math.floor(tile.y) || tile.noClip) {
            // Use Chebyshev distance of 2 for non-integer or no-clip tiles
            const distance = 2;
            let minX = Math.floor(Math.max(0, tile.x - distance));
            let maxX = Math.ceil(Math.min(this.width - 1, tile.x + distance));
            let minY = Math.floor(Math.max(0, tile.y - distance));
            let maxY = Math.ceil(Math.min(this.height - 1, tile.y + distance));

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    tilesToMark.push({x, y});
                }
            }
        } else {
            tilesToMark.push({x: Math.floor(tile.x), y: Math.floor(tile.y)});
        }

        for (const {x, y} of tilesToMark) {
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.mask[y][x] = true;
            }
        }
    }

    public clear() {
        this.mask = this.mask.map(row => row.fill(false));
    }

    public isDirty(x: number, y: number): boolean {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.mask[y][x];
    }

    public hasDirtyTiles(): boolean {
        return this.mask.some(row => row.some(cell => cell));
    }

    public getMask(): readonly boolean[][] {
        return this.mask;
    }

    public markDirtyXY(x: number, y: number) {
        x = Math.floor(x);
        y = Math.floor(y);
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.mask[y][x] = true;
        }
    }

    public markClean(x: number, y: number) {
        x = Math.floor(x);
        y = Math.floor(y);
        
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.mask[y][x] = false;
        }
    }
} 