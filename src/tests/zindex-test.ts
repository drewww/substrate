import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

interface Entity {
    x: number;
    y: number;
    dx: number;
    dy: number;
    groupId: string;
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
        const value = Math.floor(Math.random() * 32);
        return `#${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}${value.toString(16).padStart(2, '0')}FF`;
    }

    private initializeBackground() {
        this.display.setBackground('.', '#666666FF', '#000000FF');

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const noiseTile: Tile = {
                    symbol: this.BACKGROUND_SYMBOLS[Math.floor(Math.random() * this.BACKGROUND_SYMBOLS.length)],
                    fgColor: '#FFFFFFFF',
                    bgColor: this.getNearlyBlack(),
                    zIndex: 1
                };

                this.display.setTile(x, y, noiseTile);
            }
        }
    }

    private initializeEntities() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        this.entities = [];
        for (let i = 0; i < this.ENTITY_COUNT; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            const groupId = this.display.renderString(x, y, '@', '#FFFF00FF', null, 2);
            
            this.entities.push({
                x,
                y,
                dx: 0,
                dy: 0,
                groupId
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

            this.entities.forEach(entity => {
                entity.dx = Math.floor(Math.random() * 3) - 1;
                entity.dy = Math.floor(Math.random() * 3) - 1;

                entity.x = (entity.x + entity.dx + width) % width;
                entity.y = (entity.y + entity.dy + height) % height;

                this.display.moveTileGroup(entity.groupId, entity.x, entity.y);
            });
        }

        requestAnimationFrame(() => this.updateEntities());
    }

    protected run(): void {
        this.display.clear();
        this.initializeBackground();
        this.initializeEntities();
        this.updateEntities();
    }

    protected cleanup(): void {
        this.entities.forEach(entity => {
            this.display.removeTileGroup(entity.groupId);
        });
        this.entities = [];
    }
} 