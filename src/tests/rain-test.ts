import { BaseTest } from './base-test';
import { TileId } from '../types';
import { LogLevel } from '../matrix-display';

interface Raindrop {
    tileId: TileId;
    x: number;
    y: number;
    speed: number;
}

export class RainTest extends BaseTest {
    private readonly DROP_COUNT = 100;
    private readonly MIN_SPEED = 0.2;
    private readonly MAX_SPEED = 1.0;
    private readonly DROP_SYMBOLS = ['|', '│', '║'];
    private raindrops: Raindrop[] = [];
    
    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 60,
            worldHeight: 30,
            viewportWidth: 60,
            viewportHeight: 30,
            cellSize: 24,
            logLevel
        });
    }

    getName(): string {
        return "rain";
    }

    getDescription(): string {
        return "Simulates falling rain with varying speeds";
    }

    private getRandomDropSymbol(): string {
        return this.DROP_SYMBOLS[Math.floor(Math.random() * this.DROP_SYMBOLS.length)];
    }

    private createRaindrop(x: number, y: number): Raindrop {
        const speed = this.MIN_SPEED + Math.random() * (this.MAX_SPEED - this.MIN_SPEED);
        const tileId = this.display.createTile(
            x,
            y,
            this.getRandomDropSymbol(),
            '#8888FFFF',
            null,
            2
        );
        
        return { tileId, x, y, speed };
    }

    private initializeRain() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create initial raindrops
        for (let i = 0; i < this.DROP_COUNT; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            this.raindrops.push(this.createRaindrop(x, y));
        }
    }

    private updateRain() {
        if (!this.isRunning) return;

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Update each raindrop
        this.raindrops.forEach(drop => {
            drop.y += drop.speed;

            // If raindrop goes off bottom, reset to top
            if (drop.y >= height) {
                drop.y = 0;
                drop.x = Math.floor(Math.random() * width);
            }

            // Update tile position
            this.display.moveTile(drop.tileId, Math.floor(drop.x), Math.floor(drop.y));
        });

        requestAnimationFrame(() => this.updateRain());
    }

    protected run(): void {
        // Set dark background
        this.display.setBackground('.', '#666666FF', '#222222FF');
        
        this.initializeRain();
        this.updateRain();
    }

    protected cleanup(): void {
        // Remove all raindrops
        this.raindrops.forEach(drop => {
            this.display.removeTile(drop.tileId);
        });
        this.raindrops = [];
    }
} 