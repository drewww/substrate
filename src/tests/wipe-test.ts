import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

export class WipeTest extends BaseTest {
    private currentX: number = 0;
    private readonly WIPE_SPEED = 1;
    private isWiping: boolean = false;

    constructor() {
        super({
            worldWidth: 25,
            worldHeight: 25,
            viewportWidth: 25,
            viewportHeight: 25,
            cellSize: 24
        });
    }

    getName(): string {
        return "wipe";
    }

    getDescription(): string {
        return "Wipes a black overlay across random background";
    }

    private getRandomASCII(): string {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }

    private getRandomColor(): string {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
    }

    private fillRandomBackground() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Set random background tiles
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tile: Tile = {
                    symbol: this.getRandomASCII(),
                    fgColor: this.getRandomColor(),
                    bgColor: this.getRandomColor(),
                    zIndex: 1
                };
                this.display.setTiles(x, y, [tile]);
            }
        }
        this.display.render();
    }

    private updateWipe() {
        if (!this.isRunning || !this.isWiping) return;

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Apply black overlay to current column
        for (let y = 0; y < height; y++) {
            this.display.setOverlay(this.currentX, y, '#00000080');
        }

        // Move to next column
        this.currentX += this.WIPE_SPEED;

        // Check if wipe is complete after setting the overlay
        if (this.currentX >= width) {
            this.isWiping = false;
            this.display.render();
            return;
        }

        this.display.render();
        requestAnimationFrame(() => this.updateWipe());
    }

    protected run(): void {
        this.currentX = 0;
        this.isWiping = true;
        this.display.clearOverlays(); // Clear any existing overlays
        this.fillRandomBackground();
        this.updateWipe();
    }

    protected cleanup(): void {
        this.currentX = 0;
        this.isWiping = false;
    }
} 