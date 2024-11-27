import { LogLevel, MatrixDisplay, MatrixDisplayConfig } from '../matrix-display';

export abstract class BaseTest {
    protected display!: MatrixDisplay;
    public isRunning: boolean = false;
    protected options: MatrixDisplayConfig;

    constructor(options: MatrixDisplayConfig) {
        this.options = {
            ...options,
            elementId: 'canvas',
            logLevel: options.logLevel ?? LogLevel.WARN
        };
    }

    abstract getName(): string;
    abstract getDescription(): string;
    protected abstract run(): void;
    protected abstract cleanup(): void;

    public getDisplay(): MatrixDisplay {
        if (!this.display) {
            throw new Error('Display not initialized - test must be started first');
        }
        return this.display;
    }

    public start(): void {
        console.log(`Starting test: ${this.getName()}`);
        
        const container = document.getElementById('display-container')!;
        
        // Calculate container size based on viewport dimensions
        const containerWidth = this.options.viewportWidth * this.options.cellSize;
        const containerHeight = this.options.viewportHeight * this.options.cellSize;
        
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
        this.display = new MatrixDisplay(this.options);
        
        this.isRunning = true;
        this.run();
    }

    public stop(): void {
        console.log(`Stopping test: ${this.getName()}`);
        this.isRunning = false;
        this.cleanup();
        
        const canvas = document.getElementById(`display-${this.getName()}`);
        if (canvas) {
            canvas.remove();
        }
    }
} 