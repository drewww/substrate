import { BaseTest } from './base-test';
import { TileId } from '../../types';
import { Easing } from '../../display';
import { logger } from '../../../util/logger';

export class VisibilityTest extends BaseTest {
    private entityTiles: TileId[] = [];
    private readonly ENTITY_COUNT = 50;
    private readonly VISIBLE_RADIUS = 8;
    private lightSource = { x: 0, y: 0 };
    private movingRight = true;
    private debugContainer?: HTMLElement;
    private frameCounter = 0;
    private readonly FRAMES_PER_MOVE = 144;
    
    constructor() {
        super({
            worldWidth: 40,
            worldHeight: 20,
            viewportWidth: 15,
            viewportHeight: 10,
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

        // Add mask canvas to page for debugging
        const maskCanvas = this.display.getMaskCanvas();
        if (maskCanvas) {
            this.debugContainer = document.createElement('div');
            this.debugContainer.style.position = 'fixed';
            this.debugContainer.style.top = '10px';
            this.debugContainer.style.left = '10px';
            this.debugContainer.style.border = '2px solid white';
            this.debugContainer.style.padding = '5px';
            
            const label = document.createElement('div');
            label.textContent = 'Mask Canvas Debug';
            label.style.color = 'white';
            label.style.marginBottom = '5px';
            
            maskCanvas.style.width = '200px';
            maskCanvas.style.height = '100px';
            
            this.debugContainer.appendChild(label);
            this.debugContainer.appendChild(maskCanvas);
            document.body.appendChild(this.debugContainer);
        }

        // Start the light source movement and viewport updates
        this.updateLightSource();
        this.updateViewport();
    }

    private updateVisibility(): void {
        // Create a new visibility mask
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        const mask = Array(height).fill(0).map(() => Array(width).fill(0));  // Default to invisible (0)

        // Calculate bounds for the visible area
        const minX = Math.max(0, Math.floor(this.lightSource.x - this.VISIBLE_RADIUS));
        const maxX = Math.min(width - 1, Math.ceil(this.lightSource.x + this.VISIBLE_RADIUS));
        const minY = Math.max(0, Math.floor(this.lightSource.y - this.VISIBLE_RADIUS));
        const maxY = Math.min(height - 1, Math.ceil(this.lightSource.y + this.VISIBLE_RADIUS));

        // Only calculate visibility for tiles within radius
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // const dx = x - this.lightSource.x;
                // const dy = y - this.lightSource.y;
                // const distance = Math.sqrt(dx * dx + dy * dy);
                
                // if (distance <= this.VISIBLE_RADIUS) {
                //     // Create a smooth falloff
                //     const visibility = Math.max(0, 1 - (distance / this.VISIBLE_RADIUS));
                //     mask[y][x] = visibility;
                // }

                if(Math.abs(x-this.lightSource.x) <= 1 ) {
                    mask[y][x] = 1;
                } else {
                    mask[y][x] = 0.2;
                }
            }
        }

        this.display.setVisibilityMask(mask);
    }

    private updateLightSource(): void {
        if (!this.isRunning) return;

        this.frameCounter = (this.frameCounter + 1) % this.FRAMES_PER_MOVE;
        if (this.frameCounter === 0) {
            const width = this.display.getWorldWidth();
            const height = this.display.getWorldHeight();
            const speed = 1.0;
            
            // Move light source
            if (this.movingRight) {
                this.lightSource.x += speed;
                if (this.lightSource.x >= width) {
                    this.movingRight = false;
                    this.lightSource.y += height / 5;
                    
                    if (this.lightSource.y >= height) {
                        this.lightSource.y = 0;
                    }
                }
            } else {
                this.lightSource.x -= speed;
                if (this.lightSource.x <= 0) {
                    this.movingRight = true;
                    this.lightSource.y += height / 5;
                    
                    if (this.lightSource.y >= height) {
                        this.lightSource.y = 0;
                    }
                }
            }

            this.lightSource.x = Math.floor(this.lightSource.x);
            this.lightSource.y = Math.floor(this.lightSource.y);
        }

        // Update visibility every frame (but mask will only redraw if dirty)
        this.updateVisibility();

        requestAnimationFrame(() => this.updateLightSource());
    }

    private updateViewport(): void {
        if (!this.isRunning) return;

        // Calculate viewport center to follow light source
        const targetX = Math.max(this.display.getViewportWidth() / 2,
            Math.min(this.lightSource.x, 
                this.display.getWorldWidth() - this.display.getViewportWidth() / 2));
        const targetY = Math.max(this.display.getViewportHeight() / 2,
            Math.min(this.lightSource.y, 
                this.display.getWorldHeight() - this.display.getViewportHeight() / 2));

        // Smoothly move viewport to target
        this.display.setViewport(
            Math.floor(targetX - this.display.getViewportWidth() / 2),
            Math.floor(targetY - this.display.getViewportHeight() / 2),
            {
                smooth: true,
                duration: 0.05,
                easing: Easing.quadInOut
            }
        );

        requestAnimationFrame(() => this.updateViewport());
    }

    protected cleanup(): void {
        this.entityTiles.forEach(id => this.display.removeTile(id));
        this.entityTiles = [];
        this.display.clearVisibilityMask();
        
        // Remove debug container
        if (this.debugContainer) {
            document.body.removeChild(this.debugContainer);
            this.debugContainer = undefined;
        }
    }
} 