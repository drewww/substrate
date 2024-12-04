import { Display, DisplayOptions } from '../../display';
import { logger } from '../../util/logger';

export abstract class BaseTest {
    protected display!: Display;
    public isRunning: boolean = false;
    protected options: DisplayOptions;

    constructor(options: DisplayOptions) {
        this.options = {
            ...options,
            elementId: 'canvas'
        };
    }

    abstract getName(): string;
    abstract getDescription(): string;
    protected abstract run(): void;
    protected abstract cleanup(): void;

    public getDisplay(): Display {
        if (!this.display) {
            throw new Error('Display not initialized - test must be started first');
        }
        return this.display;
    }

    public start(): void {
        logger.info(`Starting test: ${this.getName()}`);
        
        const container = document.getElementById('display-container')!;
        
        // Calculate container size based on viewport dimensions
        const containerWidth = this.options.viewportWidth * this.options.cellWidth;
        const containerHeight = this.options.viewportHeight * this.options.cellHeight;
        
        // Update container size
        container.style.width = `${containerWidth}px`;
        container.style.height = `${containerHeight}px`;
        
        // Create and size the canvas
        const canvas = document.createElement('canvas');
        canvas.id = `display-${this.getName()}`;
        canvas.style.width = `${containerWidth}px`;
        canvas.style.height = `${containerHeight}px`;
        
        // Clear any existing canvas and add the new one
        container.innerHTML = '';
        container.appendChild(canvas);
        
        this.options.elementId = canvas.id;
        this.display = new Display(this.options);
        
        this.isRunning = true;
        this.run();
    }

    public stop(): void {
        logger.info(`Stopping test: ${this.getName()}`);
        this.isRunning = false;
        this.cleanup();
        
        const canvas = document.getElementById(`display-${this.getName()}`);
        if (canvas) {
            canvas.remove();
        }
    }

    public toggleDirtyMask(): boolean {
        return this.display.toggleDirtyMask();
    }
} 