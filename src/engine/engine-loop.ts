import { logger } from "../util/logger";

const CHECK_INTERVAL = 50; // Check every 50ms
const MAX_ACCUMULATED_TIME = 200; // Max 200ms of accumulated time to prevent spiral

export class EngineLoop {
    private accumulator: number = 0;
    private lastTime: number = 0;
    private running: boolean = false;
    private timeout: number | null = null;
    private isVisible: boolean = true;

    constructor(
        private readonly timestep: number,  // in ms
        private readonly updateFn: (deltaTime: number) => void
    ) {
        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            this.isVisible = document.visibilityState === 'visible';
            if (this.isVisible) {
                // Reset lastTime when becoming visible to prevent accumulated ticks
                this.lastTime = Date.now();
                this.accumulator = 0;
            }
        });
    }

    start(): void {
        this.running = true;
        this.lastTime = Date.now();
        this.check();
    }

    stop(): void {
        this.running = false;
        if (this.timeout) {
            window.clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    private check(): void {
        if (!this.running) return;

        // If tab is not visible, just reschedule with minimal accumulation
        if (!this.isVisible) {
            this.lastTime = Date.now();
            this.accumulator = Math.min(this.accumulator, this.timestep);
            this.timeout = window.setTimeout(() => this.check(), CHECK_INTERVAL);
            return;
        }

        // Get current time
        const currentTime = Date.now();

        // Calculate frame time
        const frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Add frame time to accumulator, but cap it
        this.accumulator = Math.min(
            this.accumulator + frameTime,
            MAX_ACCUMULATED_TIME
        );

        // Run as many fixed updates as needed
        while (this.accumulator >= this.timestep) {
            logger.info('================TICK================');
            this.updateFn(this.timestep / 1000); // Convert to seconds for consistency
            this.accumulator -= this.timestep;
        }

        // Schedule next check using window.setTimeout
        this.timeout = window.setTimeout(() => this.check(), CHECK_INTERVAL);
    }
} 