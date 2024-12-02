import { BaseTest } from './base-test';
import { TileId } from '../../types';
import { Easing } from '../../display';

export class AnimationLoadTest extends BaseTest {
    private animatedTiles: TileId[] = [];
    
    constructor() {
        super({
            worldWidth: 100,
            worldHeight: 50,
            viewportWidth: 60,
            viewportHeight: 30,
            cellWidth: 12,
            cellHeight: 24
        });
    }

    getName(): string {
        return "animation-load";
    }

    getDescription(): string {
        return "Load test with maximum animations";
    }

    protected run(): void {
        const startTime = performance.now();
        const symbols = ['◆', '●',  '■',  '▲'];
        const colors = [
            '#FF0000FF', // Red
            '#00FF00FF', // Green
            '#0000FFFF', // Blue
            '#FFFF00FF', // Yellow
            '#FF00FFFF', // Magenta
            '#00FFFFFF'  // Cyan
        ];

        // Fill entire world with animated tiles
        for (let y = 0; y < this.display.getWorldHeight(); y++) {
            for (let x = 0; x < this.display.getWorldWidth(); x++) {
                const tileId = this.display.createTile(
                    x, y, 
                    symbols[0], 
                    colors[0], 
                    '#000000FF', 
                    1
                );

                // 1. Symbol animation
                this.display.addSymbolAnimation(tileId, symbols, 1.0);

                // 2. Foreground color animation - Rainbow cycle
                this.display.addColorAnimation(tileId, {
                    fg: {
                        start: '#FF0000FF',
                        end: '#0000FFFF',
                        duration: 3.0,
                        reverse: true,
                        offset: (x + y) * 0.05,
                        easing: Easing.sineInOut
                    },
                    bg: {
                        start: '#00FF00FF',
                        end: '#FF00FFFF',
                        duration: 4.0,
                        reverse: true,
                        offset: (x * y) * 0.01,
                        easing: Easing.quadInOut
                    },
                    startTime: startTime
                });

                // 3. Background fill animation
                this.display.addValueAnimation(tileId, {
                    bgPercent: {
                        start: 0,
                        end: 1,
                        duration: 1.5,
                        reverse: true,
                        offset: Math.sqrt(x * x + y * y) * 0.05,
                        easing: Easing.expoInOut
                    },
                    startTime: startTime
                });

                // 4. Additional color animation layer - Opacity pulsing
                this.display.addColorAnimation(tileId, {
                    fg: {
                        start: '#FFFFFF00',
                        end: '#FFFFFFFF',
                        duration: 2.0,
                        reverse: true,
                        offset: (x - y) * 0.03,
                        easing: Easing.bounceInOut
                    },
                    bg: {
                        start: '#00000000',
                        end: '#000000FF',
                        duration: 2.5,
                        reverse: true,
                        offset: Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5
                    },
                    startTime: startTime
                });

                this.animatedTiles.push(tileId);
            }
        }
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 