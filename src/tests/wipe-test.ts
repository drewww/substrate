import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

export class WipeTest extends BaseTest {
    private currentX: number = 0;
    
    getName(): string {
        return "wipe";
    }

    getDescription(): string {
        return "Fills screen with random symbols then wipes left-to-right with black overlay";
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
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                const tile: Tile = {
                    symbol: this.getRandomASCII(),
                    fgColor: this.getRandomColor(),
                    bgColor: this.getRandomColor(),
                    zIndex: 1
                };
                this.display.setTile(x, y, tile);
            }
        }
        this.display.render();
    }

    private updateWipe() {
        if (!this.isRunning) return;

        // Set 50% opacity black overlay for current column
        for (let y = 0; y < 50; y++) {
            // 80 in hex is ~50% opacity
            this.display.setOverlay(this.currentX, y, '#00000080');
        }

        this.display.render();
        
        this.currentX++;
        
        if (this.currentX >= 50) {
            this.isRunning = false;
            return;
        }

        if (this.isRunning) {
            requestAnimationFrame(() => this.updateWipe());
        }
    }

    protected run(): void {
        this.currentX = 0;
        
        // Clear everything first
        this.display.clear();
        
        // Then set up our new background
        this.fillRandomBackground();
        this.updateWipe();
    }

    protected cleanup(): void {
        // Don't reset or clear anything in cleanup
        // This allows us to maintain the final state when stopped
    }
} 