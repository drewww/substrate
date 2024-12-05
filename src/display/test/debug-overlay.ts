import { Display } from "../display";
import { logger } from "../util/logger";
export class DebugOverlay {
    private element: HTMLDivElement;
    private dirtyMaskCanvas: HTMLCanvasElement;
    private dirtyMaskCtx: CanvasRenderingContext2D;
    private metricsDiv: HTMLDivElement;
    private boundUpdate: (display: Display) => void;

    constructor(display: Display) {
        logger.info('Initializing DebugOverlay');
        
        // Create container
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre;
            pointer-events: none;
            z-index: 1000;
        `;

        // Create metrics div
        this.metricsDiv = document.createElement('div');
        this.element.appendChild(this.metricsDiv);

        // Create dirty mask canvas
        this.dirtyMaskCanvas = document.createElement('canvas');
        this.dirtyMaskCanvas.style.cssText = `
            margin-top: 10px;
            image-rendering: pixelated;
            border: 1px solid #666;
        `;
        this.dirtyMaskCanvas.width = display.getWorldWidth();
        this.dirtyMaskCanvas.height = display.getWorldHeight();
        this.dirtyMaskCanvas.style.width = `${display.getWorldWidth() * 2}px`;
        this.dirtyMaskCanvas.style.height = `${display.getWorldHeight() * 2}px`;
        this.element.appendChild(this.dirtyMaskCanvas);

        const ctx = this.dirtyMaskCanvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D context for dirty mask canvas');
        this.dirtyMaskCtx = ctx;

        document.body.appendChild(this.element);

        // Bind update and start animation loop
        this.boundUpdate = (display: Display) => {
            this.metricsDiv.textContent = display.getDebugString();
            this.updateDirtyMaskVisualization(display);
        };
        
        display.addFrameCallback(this.boundUpdate);
        
        logger.info('DebugOverlay initialization complete');
    }

    private updateDirtyMaskVisualization(display: Display): void {
        const width = display.getWorldWidth();
        const height = display.getWorldHeight();

        this.dirtyMaskCtx.clearRect(0, 0, width, height);
        
        // Get dirty cells from display
        const mask = display.getDirtyMask();

        logger.debug(`Updating dirty mask visualization: ${width}x${height}`, mask);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (mask[y][x]) {
                    this.dirtyMaskCtx.fillStyle = '#FF0000FF';
                    this.dirtyMaskCtx.fillRect(x, y, 1, 1);
                }
            }
        }
    }

    public toggle(): void {
        this.element.style.display = this.element.style.display === 'none' ? 'block' : 'none';
    }

    public remove(): void {
        this.element.remove();
    }
} 