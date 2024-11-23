import { MatrixDisplay } from '../matrix-display';

export abstract class BaseTest {
    protected display: MatrixDisplay;
    public isRunning: boolean = false;

    constructor(display: MatrixDisplay) {
        this.display = display;
    }

    abstract getName(): string;
    abstract getDescription(): string;
    protected abstract run(): void;
    protected abstract cleanup(): void;

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