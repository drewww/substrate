import { BaseTest } from './base-test';
import { Color, TileId } from '../../types';
import { Easing } from '../../display';

export class SmallPixelTest extends BaseTest {
    private tileIds: TileId[] = [];
    private readonly ANIMATION_DURATION = 3.0;
    private readonly colors: Color[] = [
        '#FF0000FF', // Red
        '#FF7F00FF', // Orange
        '#FFFF00FF', // Yellow
        '#00FF00FF', // Green
        '#0000FFFF', // Blue
        '#4B0082FF', // Indigo
        '#8F00FFFF'  // Violet
    ];

    constructor() {
        super({
            worldWidth: 100,
            worldHeight: 100,
            viewportWidth: 100,
            viewportHeight: 100,
            cellWidth: 2,
            cellHeight: 2,
        });
    }

    getName(): string {
        return "small-pixel";
    }

    getDescription(): string {
        return "Tests display with 2x2 pixel cells and color animations";
    }

    private getColorIndex(x: number, y: number, offset: number): number {
        const centerX = this.display.getWorldWidth() / 2;
        const centerY = this.display.getWorldHeight() / 2;
        
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        const normalizedDistance = distance / maxDistance;

        // Ensure we get a valid index
        return Math.abs(Math.floor((normalizedDistance * this.colors.length + offset)) % this.colors.length);
    }

    protected run(): void {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create initial pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const colorIndex = this.getColorIndex(x, y, 0);
                const tileId = this.display.createTile(
                    x,
                    y,
                    ' ',
                    '#00000000',
                    this.colors[colorIndex],
                    1
                );

                // Add a single color animation that we'll update
                this.display.addColorAnimation(tileId, {
                    bg: {
                        start: this.colors[colorIndex],
                        end: this.colors[(colorIndex + 1) % this.colors.length],
                        duration: this.ANIMATION_DURATION,
                        easing: Easing.sineInOut,
                        loop: true
                    }
                });

                this.tileIds.push(tileId);
            }
        }

        this.animatePattern();
    }

    private animatePattern() {
        if (!this.isRunning) return;

        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        const time = (performance.now() / 1000) * 0.2; // Slow down the animation

        this.tileIds.forEach((tileId, index) => {
            const x = index % width;
            const y = Math.floor(index / width);
            
            const startIndex = this.getColorIndex(x, y, time);
            const endIndex = (startIndex + 1) % this.colors.length;

            this.display.addColorAnimation(tileId, {
                bg: {
                    start: this.colors[startIndex],
                    end: this.colors[endIndex],
                    duration: this.ANIMATION_DURATION,
                    easing: Easing.sineInOut,
                    loop: true
                }
            });
        });

        requestAnimationFrame(() => this.animatePattern());
    }

    protected cleanup(): void {
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
    }
} 