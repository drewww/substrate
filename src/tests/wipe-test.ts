import { BaseTest } from './base-test';
import { Color, TileId } from '../types';
import { FillDirection, LogLevel } from '../display';

export class WipeTest extends BaseTest {
    private currentX: number = 0;
    private readonly WIPE_SPEED = 1.0;
    private isWiping: boolean = false;
    private tileIds: TileId[] = [];
    private wipeOverlayIds: TileId[] = [];  // Track wipe overlay tiles separately

    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 70,
            worldHeight: 25,
            viewportWidth: 70,
            viewportHeight: 25,
            cellSize: 24,
            logLevel
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

    private getRandomColor(): Color {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
    }

    private fillRandomBackground() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create random background tiles
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileId = this.display.createTile(
                    x,
                    y,
                    this.getRandomASCII(),
                    this.getRandomColor(),
                    this.getRandomColor(),
                    1
                );
                this.tileIds.push(tileId);
            }
        }
    }

    private updateWipe() {
        if (!this.isRunning || !this.isWiping) return;

        const height = this.display.getWorldHeight();

        // Apply black overlay to current column
        for (let y = 0; y < height; y++) {
            const tileId = this.display.createTile(
                this.currentX,
                y,
                ' ',  // Empty character
                '#00000000',  // Transparent foreground
                '#000000AA',  // Semi-transparent black background
                100,  // High z-index to stay on top
                1,    // Full background
                FillDirection.BOTTOM
            );
            this.wipeOverlayIds.push(tileId);
        }

        // Move to next column
        this.currentX += this.WIPE_SPEED;

        // Check if wipe is complete
        if (this.currentX >= this.display.getWorldWidth()) {
            this.isWiping = false;
            return;
        }

        requestAnimationFrame(() => this.updateWipe());
    }

    protected run(): void {
        this.currentX = 0;
        this.isWiping = true;
        this.fillRandomBackground();
        this.updateWipe();
    }

    protected cleanup(): void {
        // Remove all created tiles
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.wipeOverlayIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
        this.wipeOverlayIds = [];
        
        this.currentX = 0;
        this.isWiping = false;
    }
} 