import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

interface Entity {
    x: number;
    y: number;
    dx: number;
    dy: number;
}

export class ZIndexTest extends BaseTest {
    private readonly ENTITY_COUNT = 5;
    private readonly BACKGROUND_SYMBOLS = [',', '.', '-', '=', '_'];
    private entities: Entity[] = [];
    private frameCount: number = 0;
    private readonly FRAMES_PER_MOVE = 30;
    
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
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
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
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        this.entities = [];
        for (let i = 0; i < this.ENTITY_COUNT; i++) {
            this.entities.push({
                x: Math.floor(Math.random() * width),
                y: Math.floor(Math.random() * height),
                dx: 0,
                dy: 0
            });
        }
    }

    private updateEntities() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        if (!this.isRunning) return;

        this.frameCount++;

        if (this.frameCount >= this.FRAMES_PER_MOVE) {
            this.frameCount = 0;

            // Clear previous entity positions
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const cell = this.display.getCell(x, y);
                    if (cell) {
                        const backgroundTiles = cell.tiles.filter(t => t.zIndex < 2);
                        this.display.setTiles(x, y, backgroundTiles);
                    }
                }
            }

            // Update and render entities
            this.entities.forEach(entity => {
                entity.dx = Math.floor(Math.random() * 3) - 1;
                entity.dy = Math.floor(Math.random() * 3) - 1;

                // Update position with new bounds
                entity.x = (entity.x + entity.dx + width) % width;
                entity.y = (entity.y + entity.dy + height) % height;

                const cell = this.display.getCell(entity.x, entity.y);
                const existingTiles = cell ? cell.tiles : [];

                const entityTile: Tile = {
                    symbol: '@',
                    fgColor: '#FFFF00FF',
                    bgColor: null,
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