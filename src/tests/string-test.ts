import { BaseTest } from './base-test';
import { Color } from '../types';

export class StringTest extends BaseTest {
    private activeStrings: Array<{
        groupId: string,
        text: string,
        color: Color,
        zIndex: number
    }> = [];

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
        return "Renders and removes text strings";
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
            const groupId = this.display.renderString(
                2, 
                index * 3 + 2, 
                str.text, 
                str.color, 
                "#000000FF",
                str.zIndex
            );
            this.activeStrings.push({ groupId, ...str });
        });

        // Set up periodic movement
        this.moveStringsRandomly();
    }

    private moveStringsRandomly(): void {
        if (!this.isRunning) return;

        this.activeStrings.forEach(str => {
            const newX = Math.floor(Math.random() * (this.display.getWorldWidth() - 10));
            const newY = Math.floor(Math.random() * this.display.getWorldHeight());
            this.display.moveTileGroup(str.groupId, newX, newY);
        });

        // Schedule next movement
        setTimeout(() => this.moveStringsRandomly(), 2000);
    }

    protected cleanup(): void {
        this.activeStrings.forEach(str => {
            this.display.removeTileGroup(str.groupId);
        });
        this.activeStrings = [];
    }
} 