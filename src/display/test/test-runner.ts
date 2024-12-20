import { Display } from '../display';
import { DebugOverlay } from './debug-overlay';
import { Color } from '../types';

export class TestRunner {
    private display: Display;
    public debugOverlay: DebugOverlay;
    private isRunning: boolean = false;
    private currentX: number = 0;
    private currentY: number = 0;

    constructor() {
        console.log('Initializing TestRunner');
        try {
            this.display = new Display({
                elementId: 'display',
                cellWidth: 12,
                cellHeight: 12,
                worldWidth: 50,
                worldHeight: 50,
                viewportWidth: 50,
                viewportHeight: 50
            });
            
            // Create debug overlay container
            const debugElement = document.createElement('div');
            debugElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 1000;
            `;
            document.body.appendChild(debugElement);
            
            this.debugOverlay = new DebugOverlay(this.display, debugElement);
            console.log('TestRunner initialization complete');
        } catch (error) {
            console.error('Failed to initialize TestRunner:', error);
            throw error;
        }
    }

    private getRandomColor(): Color {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
    }

    private getRandomASCII(): string {
        // ASCII printable characters range from 33 to 126
        return String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }

    private updateNextTile() {
        const tileId = this.display.createTile(
            this.currentX,
            this.currentY,
            this.getRandomASCII(),
            this.getRandomColor(),
            this.getRandomColor(),
            1
        );
        
        console.log(`Created tile at (${this.currentX},${this.currentY}):`, tileId);
        
        // Move to next position
        this.currentX++;
        if (this.currentX >= 50) {
            this.currentX = 0;
            this.currentY++;
            if (this.currentY >= 50) {
                this.currentY = 0;
            }
        }

        if (this.isRunning) {
            requestAnimationFrame(() => this.updateNextTile());
        }
    }

    public start() {
        console.log('Starting test');
        this.isRunning = true;
        this.updateNextTile();
    }

    public stop() {
        console.log('Stopping test');
        this.isRunning = false;
    }

    public toggle() {
        console.log('Toggling test:', !this.isRunning);
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
} 