import { BaseTest } from './base-test';
import { TileId } from '../../types';
import { Easing } from '../../display';

export class VisibilityTest extends BaseTest {
    private entityTiles: TileId[] = [];
    private readonly ENTITY_COUNT = 50;
    private readonly VISIBLE_RADIUS = 5;
    private lightSource = { x: 0, y: 0 };
    private movingRight = true;
    
    constructor() {
        super({
            worldWidth: 40,
            worldHeight: 20,
            viewportWidth: 40,
            viewportHeight: 20,
            cellWidth: 16,
            cellHeight: 16
        });
    }

    getName(): string {
        return "visibility";
    }

    getDescription(): string {
        return "Demonstrates visibility mask with moving light source";
    }

    protected run(): void {
        // Set dark background
        this.display.setBackground('.', '#333333FF', '#111111FF');
        
        // Create random entities
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        for (let i = 0; i < this.ENTITY_COUNT; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const symbols = ['@', '&', 'M', 'D', 'H'];
            const colors = ['#FF0000FF', '#00FF00FF', '#0000FFFF', '#FFFF00FF'];
            
            const tileId = this.display.createTile(
                x, y,
                symbols[Math.floor(Math.random() * symbols.length)],
                colors[Math.floor(Math.random() * colors.length)],
                '#000000FF',
                1
            );
            
            this.entityTiles.push(tileId);
        }

        // Start the light source movement
        this.updateLightSource();
    }

    private updateVisibility(): void {
        // Create a new visibility mask
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        const mask = Array(height).fill(0).map(() => Array(width).fill(0));

        // Calculate visibility based on distance from light source
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - this.lightSource.x;
                const dy = y - this.lightSource.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Create a smooth falloff
                const visibility = Math.max(0, 1 - (distance / this.VISIBLE_RADIUS));
                mask[y][x] = visibility;
            }
        }

        this.display.setVisibilityMask(mask);
    }

    private updateLightSource(): void {
        if (!this.isRunning) return;

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        const speed = 0.1;
        
        // Move light source
        if (this.movingRight) {
            this.lightSource.x += speed;
            if (this.lightSource.x >= width) {
                this.movingRight = false;
                this.lightSource.y += height / 5; // Move down by 1/5th of height
                
                // If we've reached the bottom, reset to top
                if (this.lightSource.y >= height) {
                    this.lightSource.y = 0;
                }
            }
        } else {
            this.lightSource.x -= speed;
            if (this.lightSource.x <= 0) {
                this.movingRight = true;
                this.lightSource.y += height / 5; // Move down by 1/5th of height
                
                // If we've reached the bottom, reset to top
                if (this.lightSource.y >= height) {
                    this.lightSource.y = 0;
                }
            }
        }

        // Update visibility based on new light source position
        this.updateVisibility();

        requestAnimationFrame(() => this.updateLightSource());
    }

    protected cleanup(): void {
        this.entityTiles.forEach(id => this.display.removeTile(id));
        this.entityTiles = [];
        this.display.clearVisibilityMask();
    }
} 