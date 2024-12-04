export class DirtyMask {
    private mask: boolean[][];

    constructor(
        private readonly width: number,
        private readonly height: number
    ) {
        this.mask = Array(height).fill(0)
            .map(() => Array(width).fill(false));
    }

    public markDirty(x: number, y: number) {
        if (x >= 0 && x < this.width && 
            y >= 0 && y < this.height) {
            this.mask[y][x] = true;
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