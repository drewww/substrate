import { MatrixDisplay } from '../matrix-display';
import { DebugOverlay } from '../debug-overlay';
import { Color, Tile } from '../types';

export class TestRunner {
    private display: MatrixDisplay;
    public debugOverlay: DebugOverlay;
    private isRunning: boolean = false;
    private currentX: number = 0;
    private currentY: number = 0;

    constructor() {
        this.display = new MatrixDisplay({
            elementId: 'display',
            cellSize: 12,
            worldWidth: 50,
            worldHeight: 50,
            viewportWidth: 50,
            viewportHeight: 50
        });
        
        this.debugOverlay = new DebugOverlay(this.display);
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
        const tile: Tile = {
            symbol: this.getRandomASCII(),
            fgColor: this.getRandomColor(),
            bgColor: this.getRandomColor(),
            zIndex: 1
        };

        this.display.setTile(this.currentX, this.currentY, tile);
        
        // Move to next position
        this.currentX++;
        if (this.currentX >= 50) {
            this.currentX = 0;
            this.currentY++;
            if (this.currentY >= 50) {
                this.currentY = 0;
            }
        }

        this.display.render();

        if (this.isRunning) {
            requestAnimationFrame(() => this.updateNextTile());
        }
    }

    public start() {
        this.isRunning = true;
        this.updateNextTile();
    }

    public stop() {
        this.isRunning = false;
    }

    public toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
} 