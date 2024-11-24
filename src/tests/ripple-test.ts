import { BaseTest } from './base-test';

interface Ripple {
    centerX: number;
    centerY: number;
    radius: number;
    maxRadius: number;
    intensity: number;
}

export class RippleTest extends BaseTest {
    private ripples: Ripple[] = [];
    private readonly RIPPLE_SPEED = 0.5;
    private readonly FADE_RATE = 0.02;
    private timeSinceLastRipple: number = 0;
    
    constructor() {
        super({
            worldWidth: 25,
            worldHeight: 25,
            viewportWidth: 25,
            viewportHeight: 25,
            cellSize: 24
        });
    }

    getName(): string {
        return "ripple";
    }

    getDescription(): string {
        return "Creates expanding circular ripples with fading overlays";
    }

    private addRipple() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        const ripple: Ripple = {
            centerX: Math.floor(Math.random() * width),
            centerY: Math.floor(Math.random() * height),
            radius: 0,
            maxRadius: 8 + Math.random() * 5,
            intensity: 1.0
        };
        this.ripples.push(ripple);
    }

    private updateRipples() {
        if (!this.isRunning) return;

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Clear all overlays
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.display.setOverlay(x, y, '#00000000');
            }
        }

        // Update and render each ripple
        this.ripples = this.ripples.filter(ripple => {
            ripple.radius += this.RIPPLE_SPEED;
            ripple.intensity -= this.FADE_RATE;

            if (ripple.intensity <= 0 || ripple.radius >= ripple.maxRadius) {
                return false;
            }

            // Draw the ripple
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const distance = Math.sqrt(
                        Math.pow(x - ripple.centerX, 2) + 
                        Math.pow(y - ripple.centerY, 2)
                    );
                    
                    if (Math.abs(distance - ripple.radius) < 1.5) {
                        const alpha = Math.floor(ripple.intensity * 255).toString(16).padStart(2, '0');
                        this.display.setOverlay(x, y, `#FFFFFF${alpha}`);
                    }
                }
            }

            return true;
        });

        // Add new ripple occasionally
        this.timeSinceLastRipple++;
        if (this.timeSinceLastRipple > 30) {
            this.addRipple();
            this.timeSinceLastRipple = 0;
        }

        this.display.render();
        requestAnimationFrame(() => this.updateRipples());
    }

    protected run(): void {
        this.display.clear();
        this.ripples = [];
        this.timeSinceLastRipple = 0;
        this.updateRipples();
    }

    protected cleanup(): void {
        this.ripples = [];
    }
} 