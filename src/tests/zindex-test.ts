import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

interface Entity {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

export class ZIndexTest extends BaseTest {
    private readonly ENTITY_COUNT = 10;
    private readonly BACKGROUND_SYMBOLS = [',', '.', '-', '=', '_'];
    private entities: Entity[] = [];
    private frameCount: number = 0;
    private readonly FRAMES_PER_MOVE = 30; // At 60fps, this is one move every 0.5 seconds
    
    constructor() {
        super({
            worldWidth: 50,
            worldHeight: 50,
            viewportWidth: 50,
            viewportHeight: 50
        });
    }

    getName(): string {
        return "zindex";
    }

    getDescription(): string {
        return "Tests z-index rendering with moving entities over background";
    }

    private getNearlyBlack(): Color {
        // Generate a very dark color
        const value = Math.floor(Math.random() * 32); // 0-31 for dark colors
        return `#${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}FF`;
    }

    private initializeBackground() {
        // Set empty background
        for (let y = 0; y < 50; y++) {
            for (let x = 0; x < 50; x++) {
                // Background tile with no symbol
                const bgTile: Tile = {
                    symbol: '',
                    fgColor: null,
                    bgColor: '#000000FF',
                    zIndex: 0
                };

                // Noise tile with symbol
                const noiseTile: Tile = {
                    symbol: this.BACKGROUND_SYMBOLS[Math.floor(Math.random() * this.BACKGROUND_SYMBOLS.length)],
                    fgColor: '#FFFFFFFF',
                    bgColor: this.getNearlyBlack(),
                    zIndex: 1
                };

                this.display.setTiles(x, y, [bgTile, noiseTile]);
            }
        }
    }

    private initializeEntities() {
        this.entities = [];
        for (let i = 0; i < this.ENTITY_COUNT; i++) {
            this.entities.push({
                x: Math.floor(Math.random() * 50),
                y: Math.floor(Math.random() * 50),
                dx: 0,
                dy: 0
            });
        }
    }

    private updateEntities() {
        if (!this.isRunning) return;

        this.frameCount++;

        // Only move entities every FRAMES_PER_MOVE frames
        if (this.frameCount >= this.FRAMES_PER_MOVE) {
            this.frameCount = 0;

            // Clear previous entity positions
            for (let y = 0; y < 50; y++) {
                for (let x = 0; x < 50; x++) {
                    const cell = this.display.getCell(x, y);
                    if (cell) {
                        const backgroundTiles = cell.tiles.filter(t => t.zIndex < 2);
                        this.display.setTiles(x, y, backgroundTiles);
                    }
                }
            }

            // Update and render entities
            this.entities.forEach(entity => {
                // Always change direction when we move
                entity.dx = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
                entity.dy = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1

                // Update position
                entity.x = (entity.x + entity.dx + 50) % 50; // Wrap around
                entity.y = (entity.y + entity.dy + 50) % 50; // Wrap around

                // Get existing tiles
                const cell = this.display.getCell(entity.x, entity.y);
                const existingTiles = cell ? cell.tiles : [];

                // Add entity tile
                const entityTile: Tile = {
                    symbol: '@',
                    fgColor: '#FFFF00FF', // Yellow
                    bgColor: null, // Inherit from below
                    zIndex: 2
                };

                this.display.setTiles(entity.x, entity.y, [...existingTiles, entityTile]);
            });
        }

        this.display.render();
        requestAnimationFrame(() => this.updateEntities());
    }

    protected run(): void {
        this.display.clear();
        this.initializeBackground();
        this.initializeEntities();
        this.updateEntities();
    }

    protected cleanup(): void {
        this.entities = [];
    }
} 