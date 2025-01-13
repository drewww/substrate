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
        const shapeSymbols = ['◆', '●',  '■',  '▲'];
        const colors = [
            '#FF0000FF', // Red
            '#00FF00FF', // Green
            '#0000FFFF', // Blue
            '#FFFF00FF', // Yellow
            '#FF00FFFF', // Magenta
            '#00FFFFFF'  // Cyan
        ];

        this.display.setBackground(' ', '#000000FF', '#000000FF');

        // Fill entire world with animated tiles
        for (let y = 0; y < this.display.getWorldHeight(); y++) {
            for (let x = 0; x < this.display.getWorldWidth(); x++) {
                const tileId = this.display.createTile(
                    x, y, 
                    shapeSymbols[0], 
                    colors[0], 
                    '#555555FF', 
                    1
                );

                // 1. Symbol animation
                this.display.addSymbolAnimation(tileId, {
                    symbol: {
                        symbols: shapeSymbols,
                        duration: 1.0,
                        loop: true
                    },
                    startTime: startTime
                });

                // 2. Foreground color animation - Rainbow cycle
                this.display.addColorAnimation(tileId, {
                    fg: {
                        start: '#FF0000FF',
                        end: colors[x % colors.length],
                        duration: 3.0,
                        reverse: true,
                        progressOffset: (x + y) * 0.05,
                        easing: Easing.sineInOut,
                        loop: true
                    },
                    bg: {
                        start: '#00FF00FF',
                        end: colors[x % colors.length],
                        duration: 4.0,
                        reverse: true,
                        progressOffset: (x * y) * 0.01,
                        easing: Easing.quadInOut,
                        loop: true
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
                        progressOffset: Math.sqrt(x * x + y * y) * 0.05,
                        easing: Easing.expoInOut,
                        loop: true
                    },
                    startTime: startTime
                });

                // 4. Additional color animation layer - Opacity pulsing
                // this.display.addColorAnimation(tileId, {
                //     fg: {
                //         start: '#FFFFFF00',
                //         end: '#FFFFFFFF',
                //         duration: 2.0,
                //         reverse: true,
                //         offset: (x - y) * 0.03,
                //         easing: Easing.bounceInOut,
                //         loop: true
                //     },
                //     bg: {
                //         start: '#00000000',
                //         end: '#000000FF',
                //         duration: 2.5,
                //         reverse: true,
                //         offset: Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5,
                //         loop: true
                //     },
                //     startTime: startTime
                // });

                this.animatedTiles.push(tileId);
            }
        }
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 