import { Display } from "../display";
import { logger } from "../../util/logger";

export class DebugOverlay {
    private visible = false;
    private metricsDiv: HTMLDivElement;
    private boundUpdate: (display: Display) => void;

    constructor(
        private display: Display,
        private element: HTMLElement
    ) {
        logger.info('Initializing DebugOverlay');
        
        // Create metrics div
        this.metricsDiv = document.createElement('div');
        this.element.appendChild(this.metricsDiv);

        // Bind update and start animation loop
        this.boundUpdate = (display: Display) => {
            this.metricsDiv.textContent = display.getDebugString();
            // this.updateDirtyMaskVisualization(display);
        };
        
        display.addFrameCallback(this.boundUpdate);
        
        logger.info('DebugOverlay initialization complete');
    }

    public toggle(): void {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
    }

    public show(): void {
        this.visible = true;
        this.element.style.display = 'block';
    }

    public hide(): void {
        this.visible = false;
        this.element.style.display = 'none';
    }

    public get isVisible(): boolean {
        return this.visible;
    }

    public remove(): void {
        this.display.removeFrameCallback(this.boundUpdate);
        this.element.remove();
    }
} 