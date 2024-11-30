import { BaseTest } from './base-test';
import { Color, TileId } from '../types';
import { Easing, LogLevel } from '../matrix-display';

export class ZIndexTest extends BaseTest {
    private readonly TILE_COUNT = 5;
    private readonly BACKGROUND_SYMBOLS = [',', '.', '-', '=', '_'];
    private tileIds: TileId[] = [];
    private backgroundTileIds: TileId[] = [];
    private readonly SECONDS_SINCE_MOVED = 2;
    private lastMovedTimestamp: number;
    
    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 25,
            worldHeight: 25,
            viewportWidth: 25,
            viewportHeight: 25,
            cellSize: 24,
            logLevel
        });
        this.lastMovedTimestamp = 0;
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
                const tileId = this.display.createTile(
                    x,
                    y,
                    this.BACKGROUND_SYMBOLS[Math.floor(Math.random() * this.BACKGROUND_SYMBOLS.length)],
                    '#FFFFFFFF',
                    this.getNearlyBlack(),
                    1
                );
                this.backgroundTileIds.push(tileId);
            }
        }
    }

    private initializeTiles() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        for (let i = 0; i < this.TILE_COUNT; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            
            const tileId = this.display.createTile(
                x,
                y,
                '@',
                '#FFFF00FF',
                '#00000066',
                2
            );
            
            this.tileIds.push(tileId);
        }
    }

    private updateTiles(timestamp: number) {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        if (!this.isRunning) return;

        const timeSinceMoved = timestamp - this.lastMovedTimestamp;

        if (timeSinceMoved >= this.SECONDS_SINCE_MOVED * 1000) {
            this.lastMovedTimestamp = timestamp;
            this.display.log.info(`Moving tiles at timestamp ${timestamp}`);

            this.tileIds.forEach(tileId => {
                const tile = this.display.getTile(tileId);
                if (!tile) return;

                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                
                const newX = Math.floor(tile.x + dx);
                const newY = Math.floor(tile.y + dy);

                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const moveDuration = 0.5;
                    
                    this.display.clearAnimations(tileId);
                    
                    if (Math.random() < 0.5) {
                        // Z-axis jump animation
                        this.display.addValueAnimation(tileId, {
                            x: {
                                start: Math.floor(tile.x),
                                end: newX,
                                duration: moveDuration,
                                easing: Easing.sineInOut,
                                loop: false
                            },
                            y: {
                                start: Math.floor(tile.y),
                                end: newY,
                                duration: moveDuration,
                                easing: Easing.sineInOut,
                                loop: false
                            },
                            scaleSymbolX: {
                                start: 1,
                                end: 2,
                                duration: moveDuration / 2,
                                easing: Easing.quadOut,
                                loop: false
                            },
                            scaleSymbolY: {
                                start: 1,
                                end: 2,
                                duration: moveDuration / 2,
                                easing: Easing.quadOut,
                                loop: false
                            }
                        });
                        
                        // Add the "falling" part of the animation after a delay
                        setTimeout(() => {
                            this.display.addValueAnimation(tileId, {
                                scaleSymbolX: {
                                    start: 2,
                                    end: 1,
                                    duration: moveDuration / 2,
                                    easing: Easing.quadIn,
                                    loop: false
                                },
                                scaleSymbolY: {
                                    start: 2,
                                    end: 1,
                                    duration: moveDuration / 2,
                                    easing: Easing.quadIn,
                                    loop: false
                                }
                            });
                        }, (moveDuration / 2) * 1000);
                    } else {
                        // Stretchy movement
                        const stretchX = Math.abs(dx) > 0 ? 1.5 : 1;
                        const stretchY = Math.abs(dy) > 0 ? 1.5 : 1;
                        
                        this.display.addValueAnimation(tileId, {
                            x: {
                                start: Math.floor(tile.x),
                                end: newX,
                                duration: moveDuration,
                                easing: Easing.bounceOut,
                                loop: false
                            },
                            y: {
                                start: Math.floor(tile.y),
                                end: newY,
                                duration: moveDuration,
                                easing: Easing.bounceOut,
                                loop: false
                            },
                            scaleSymbolX: {
                                start: 1,
                                end: stretchX,
                                duration: moveDuration / 2,
                                easing: Easing.quadOut,
                                loop: false
                            },
                            scaleSymbolY: {
                                start: 1,
                                end: stretchY,
                                duration: moveDuration / 2,
                                easing: Easing.quadOut,
                                loop: false
                            }
                        });
                    }
                }
            });
        }

        requestAnimationFrame(timestamp => this.updateTiles(timestamp));
    }

    protected run(): void {
        this.display.clear();
        this.initializeBackground();
        this.initializeTiles();
        this.lastMovedTimestamp = performance.now();
        requestAnimationFrame(t => this.updateTiles(t));
    }

    protected cleanup(): void {
        this.tileIds.forEach(id => {
            this.display.removeTile(id);
        });
        this.tileIds = [];

        this.backgroundTileIds.forEach(id => {
            this.display.removeTile(id);
        });
        this.backgroundTileIds = [];
    }
} 