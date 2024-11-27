import { BaseTest } from './base-test';
import { TileId } from '../types';
import { LogLevel } from '../matrix-display';

interface ActiveString {
    tileIds: TileId[];
    text: string;
    zIndex: number;
}

export class StringTest extends BaseTest {
    private activeStrings: ActiveString[] = [];

    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 60,
            worldHeight: 25,
            viewportWidth: 60,
            viewportHeight: 25,
            cellSize: 24,
            logLevel
        });
    }

    getName(): string {
        return "string";
    }

    getDescription(): string {
        return "Renders colored text strings with movement";
    }

    protected run(): void {
        // Set dark gray background with dots
        this.display.setBackground('.', '#AAAAAAFF', '#222222FF');

        const strings = [
            { text: "{r}Hello{/}, {b}Matrix{/} {g}Display!{/}", zIndex: 5 },
            { text: "{g}Lorem ipsum{/} {y}dolor{/} {r}sit amet{/}", zIndex: 4 },
            { text: "{b}This is a {y}very{/} long string{/}", zIndex: 3 },
            { text: "{y}Short{/} {m}text{/}", zIndex: 2 },
            { text: "{#FF00FF}Custom{/} {r}colored{/} {b}string{/}", zIndex: 1 }
        ];

        // Add initial strings
        strings.forEach((str, index) => {
            const tileIds = this.display.createColoredString(
                2, 
                index * 3 + 2, 
                str.text,
                str.zIndex
            );
            this.activeStrings.push({ tileIds, text: str.text, zIndex: str.zIndex });
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