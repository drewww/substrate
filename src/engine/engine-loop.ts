import { logger } from "../util/logger";

export class EngineLoop {
    private accumulator: number = 0;
    private lastTime: number = 0;
    private running: boolean = false;
    private timeout: number | null = null;

    constructor(
        private readonly timestep: number,  // in ms
        private readonly updateFn: (deltaTime: number) => void
    ) {}

    start(): void {
        this.running = true;
        this.lastTime = Date.now();
        this.tick();
    }

    stop(): void {
        this.running = false;
        if (this.timeout) {
            window.clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    private tick(): void {
        if (!this.running) return;

        logger.info('================TICK================');
        // Get current time
        const currentTime = Date.now();

        // Calculate frame time
        const frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Add frame time to accumulator
        this.accumulator += frameTime;

        // Run as many fixed updates as needed
        while (this.accumulator >= this.timestep) {
            this.updateFn(this.timestep / 1000); // Convert to seconds for consistency
            this.accumulator -= this.timestep;
        }

        // Schedule next tick using window.setTimeout
        this.timeout = window.setTimeout(() => this.tick(), this.timestep);
    }
} 