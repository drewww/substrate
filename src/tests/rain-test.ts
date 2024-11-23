import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

interface Raindrop {
    x: number;
    y: number;
    speed: number;
    length: number;
    color: Color;
}

export class RainTest extends BaseTest {
    private raindrops: Raindrop[] = [];
    private readonly MAX_DROPS = 100;
    private readonly MIN_SPEED = 0.2;
    private readonly MAX_SPEED = 0.8;
    private readonly MIN_LENGTH = 3;
    private readonly MAX_LENGTH = 8;
    private readonly SPAWN_CHANCE = 0.2;
    
    constructor() {
        super({
            worldWidth: 50,
            worldHeight: 50,
            viewportWidth: 50,
            viewportHeight: 50
        });
    }

    getName(): string {
        return "rain";
    }

    getDescription(): string {
        return "Digital rain effect";
    }

    private createRaindrop(): Raindrop {
        return {
            x: Math.floor(Math.random() * 50),
            y: 0,
            speed: this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED),
            length: this.MIN_LENGTH + Math.floor(Math.random() * (this.MAX_LENGTH - this.MIN_LENGTH)),
            color: '#00FF00FF'
        };
    }

    private updateRain() {
        if (!this.isRunning) return;

        // Clear previous frame
        this.display.clear();

        // Spawn new raindrops
        if (this.raindrops.length < this.MAX_DROPS && Math.random() < this.SPAWN_CHANCE) {
            this.raindrops.push(this.createRaindrop());
        }

        // Update and render existing raindrops
        this.raindrops = this.raindrops.filter(drop => {
            // Update position
            drop.y += drop.speed;

            // Render raindrop trail
            for (let i = 0; i < drop.length; i++) {
                const y = Math.floor(drop.y) - i;
                if (y >= 0 && y < 50) {
                    // Fade out based on position in trail
                    const alpha = Math.floor(255 * (1 - i / drop.length)).toString(16).padStart(2, '0');
                    const color = `#00FF00${alpha}`;
                    
                    const tile: Tile = {
                        symbol: String.fromCharCode(33 + Math.floor(Math.random() * 94)),
                        fgColor: color,
                        bgColor: '#000000FF',
                        zIndex: 1
                    };
                    this.display.setTile(Math.floor(drop.x), y, tile);
                }
            }

            // Remove drops that have fallen off the bottom
            return drop.y - drop.length < 50;
        });

        this.display.render();
        requestAnimationFrame(() => this.updateRain());
    }

    protected run(): void {
        this.raindrops = [];
        this.display.clear();
        this.updateRain();
    }

    protected cleanup(): void {
        this.raindrops = [];
    }
} 