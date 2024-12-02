import { BaseTest } from './base-test';
import { Color, TileId } from '../../types';
import { Easing, FillDirection } from '../../display';
import { logger } from '../../util/logger';

export class JumpTest extends BaseTest {
    private readonly TILE_COUNT = 5;
    private readonly BACKGROUND_SYMBOLS = [',', '.', '-', '=', '_'];
    private tileIds: TileId[] = [];
    private backgroundTileIds: TileId[] = [];
    private readonly SECONDS_SINCE_MOVED = 2;
    private lastMovedTimestamp: number;
    
    constructor() {
        super({
            worldWidth: 25,
            worldHeight: 25,
            viewportWidth: 25,
            viewportHeight: 25,
            cellWidth: 12,
            cellHeight: 24,
        });
        this.lastMovedTimestamp = 0;
    }

    getName(): string {
        return "jump";
    }

    getDescription(): string {
        return "Shows tiles 'jumping' in the z axis.";
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
                2,
                {
                    bgPercent: 0,
                    fillDirection: FillDirection.TOP,
                    noClip: true
                }
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
            logger.info(`Moving tiles at timestamp ${timestamp}`);

            this.tileIds.forEach(tileId => {
                const tile = this.display.getTile(tileId);
                if (!tile) return;

                const dx = Math.floor(Math.random() * 3) - 1;
                const dy = Math.floor(Math.random() * 3) - 1;
                
                const startX = Math.floor(tile.x);
                const startY = Math.floor(tile.y);
                const newX = startX + dx;
                const newY = startY + dy;

                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const moveDuration = 0.3;
                    const halfDuration = moveDuration / 2;

                    this.display.clearAnimations(tileId);

                    // First animation - full movement and first half of scale
                    this.display.addValueAnimation(tileId, {
                        x: {
                            start: startX,
                            end: newX,
                            duration: moveDuration,
                            easing: Easing.linear,
                            loop: false
                        },
                        y: {
                            start: startY,
                            end: newY,
                            duration: moveDuration,
                            easing: Easing.linear,
                            loop: false
                        },
                        scaleSymbolX: {
                            start: 1.0,
                            end: 2.0,
                            duration: halfDuration,  // First half only
                            easing: Easing.quadOut,
                            loop: false
                        },
                        scaleSymbolY: {
                            start: 1.0,
                            end: 2.0,
                            duration: halfDuration,  // First half only
                            easing: Easing.quadOut,
                            loop: false
                        }
                    });

                    // Second animation - just the second half of scale
                    const startTime = performance.now() + (halfDuration * 1000);
                    this.display.addValueAnimation(tileId, {
                        scaleSymbolX: {
                            start: 2.0,
                            end: 1.0,
                            duration: halfDuration,
                            easing: Easing.quadIn,
                            loop: false
                        },
                        scaleSymbolY: {
                            start: 2.0,
                            end: 1.0,
                            duration: halfDuration,
                            easing: Easing.quadIn,
                            loop: false
                        },
                        startTime
                    });
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