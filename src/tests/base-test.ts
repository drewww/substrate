import { MatrixDisplay, MatrixDisplayConfig } from '../matrix-display';

export abstract class BaseTest {
    protected display: MatrixDisplay;
    public isRunning: boolean = false;

    constructor(defaultConfig?: Partial<MatrixDisplayConfig>) {
        // Default configuration
        const config: MatrixDisplayConfig = {
            elementId: 'display',
            cellSize: 24,
            worldWidth: 25,
            worldHeight: 25,
            viewportWidth: 25,
            viewportHeight: 25,
            ...defaultConfig  // Override with any provided config
        };

        this.display = new MatrixDisplay(config);
    }

    abstract getName(): string;
    abstract getDescription(): string;
    protected abstract run(): void;
    protected abstract cleanup(): void;

    public getDisplay(): MatrixDisplay {
        return this.display;
    }

    public start(): void {
        console.log(`Starting test: ${this.getName()}`);
        this.isRunning = true;
        this.run();
    }

    public stop(): void {
        console.log(`Stopping test: ${this.getName()}`);
        this.isRunning = false;
        this.cleanup();
    }
} 