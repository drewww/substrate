import { BaseTest } from './base-test';
import { Color, TileId } from '../types';

interface ActiveString {
    tileIds: TileId[];
    text: string;
    color: Color;
    zIndex: number;
}

export class StringTest extends BaseTest {
    private activeStrings: ActiveString[] = [];

    constructor() {
        super({
            worldWidth: 60,
            worldHeight: 25,
            viewportWidth: 60,
            viewportHeight: 25,
            cellSize: 24
        });
    }

    getName(): string {
        return "string";
    }

    getDescription(): string {
        return "Renders and moves text strings";
    }

    private createString(x: number, y: number, text: string, color: Color, zIndex: number): TileId[] {
        const tileIds: TileId[] = [];
        
        // Create a tile for each character
        Array.from(text).forEach((char, index) => {
            const tileId = this.display.createTile(
                x + index,
                y,
                char,
                color,
                "#000000FF",
                zIndex
            );
            tileIds.push(tileId);
        });

        return tileIds;
    }

    protected run(): void {
        // Set dark gray background with dots
        this.display.setBackground('.', '#AAAAAAFF', '#222222FF');

        const strings = [
            { text: "Hello, Matrix Display!", color: '#FF0000FF', zIndex: 5 },
            { text: "Lorem ipsum dolor sit amet", color: '#00FF00FF', zIndex: 4 },
            { text: "This is a very long string", color: '#0088FFFF', zIndex: 3 },
            { text: "Short text", color: '#FFFF00FF', zIndex: 2 },
            { text: "Another string here", color: '#FF00FFFF', zIndex: 1 }
        ];

        // Add initial strings
        strings.forEach((str, index) => {
            const tileIds = this.createString(2, index * 3 + 2, str.text, str.color, str.zIndex);
            this.activeStrings.push({ tileIds, ...str });
        });

        // Set up periodic movement
        this.moveStringsRandomly();
    }

    private moveStringsRandomly(): void {
        if (!this.isRunning) return;

        this.activeStrings.forEach(str => {
            const newX = Math.floor(Math.random() * (this.display.getWorldWidth() - str.text.length));
            const newY = Math.floor(Math.random() * this.display.getWorldHeight());
            
            // Calculate movement delta
            const firstTile = this.display.getTile(str.tileIds[0]);
            if (firstTile) {
                const dx = newX - firstTile.x;
                const dy = newY - firstTile.y;
                this.display.moveTiles(str.tileIds, dx, dy);
            }
        });

        // Schedule next movement
        setTimeout(() => this.moveStringsRandomly(), 2000);
    }

    protected cleanup(): void {
        this.activeStrings.forEach(str => {
            this.display.removeTiles(str.tileIds);
        });
        this.activeStrings = [];
    }
} 