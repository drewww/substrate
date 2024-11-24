import { MatrixDisplay } from "./matrix-display";

export class DebugOverlay {
    private element: HTMLDivElement;

    constructor(display: MatrixDisplay) {
        console.log('Initializing DebugOverlay');
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
        document.body.appendChild(this.element);

        // Update metrics every 100ms
        setInterval(() => {
            this.element.textContent = display.getDebugString();
        }, 100);
        console.log('DebugOverlay initialization complete');
    }

    public toggle() {
        console.log('Toggling debug overlay');
        this.element.style.display = 
            this.element.style.display === 'none' ? 'block' : 'none';
    }

    public remove(): void {
        this.element.remove();
    }
} 