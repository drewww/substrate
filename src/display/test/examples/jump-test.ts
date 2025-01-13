import { BaseTest } from './base-test';
import { Color, TileId } from '../../types';
import { Easing, FillDirection } from '../../display';
import { logger } from '../../../util/logger';

export class JumpTest extends BaseTest {
    private readonly TILE_COUNT = 3;
    private readonly BACKGROUND_SYMBOLS = [',', '.', '-', '=', '_'];
    private tileIds: TileId[] = [];
    private backgroundTileIds: TileId[] = [];
    private lastMovedTimestamp: number;

    private readonly DURATION_MULTIPLIER = 1.5;
    private readonly SECONDS_SINCE_MOVED = 1 * this.DURATION_MULTIPLIER;

    
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
        // this.display.setBackground('.', '#666666FF', '#000000FF');

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
                '#00000000',
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

                // Pick a random cardinal direction (0=north, 1=east, 2=south, 3=west)
                const direction = Math.floor(Math.random() * 4);
                const [dx, dy] = [
                    [0, -5],  // North
                    [5, 0],   // East
                    [0, 5],   // South
                    [-5, 0],  // West
                ][direction];

                const startX = Math.floor(tile.x);
                const startY = Math.floor(tile.y);
                const newX = startX + dx;
                const newY = startY + dy;

                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    // Clear any existing animations
                    this.display.clearAnimations(tileId);

                    // First segment: Move 2 spaces (40% of the distance)
                    const firstMove = {
                        start: startX,
                        end: startX + (dx * 0.4),
                        duration: 0.3 * this.DURATION_MULTIPLIER,
                        easing: Easing.quadIn,
                        loop: false,
                        next: {
                            // Second segment: Move remaining 3 spaces with a jump
                            start: startX + (dx * 0.4),
                            end: newX,
                            duration: 0.4 * this.DURATION_MULTIPLIER,
                            easing: Easing.expoOut,
                            loop: false
                        }
                    };

                    const firstMoveY = {
                        start: startY,
                        end: startY + (dy * 0.4),
                        duration: 0.3 * this.DURATION_MULTIPLIER,
                        easing: Easing.quadIn,
                        loop: false,
                        next: {
                            start: startY + (dy * 0.4),
                            end: newY,
                            duration: 0.4 * this.DURATION_MULTIPLIER,
                            easing: Easing.expoOut,
                            loop: false
                        }
                    };

                    // Scale animation that coincides with the second movement
                    const scaleXAnimation = {
                        start: 1.0,
                        end: direction === 1 || direction === 3 ? 0.6 : 1.0,
                        duration: 0.2 * this.DURATION_MULTIPLIER,
                        easing: Easing.quadOut,
                        loop: false,
                        next: {
                            start: direction === 1 || direction === 3 ? 0.6 : 1.0,
                            end: 2.5,
                            duration: 0.2 * this.DURATION_MULTIPLIER,
                            easing: Easing.quadIn,
                            loop: false,
                            next: {
                                start: 2.5,
                                end: 1.0,
                                duration: 0.2 * this.DURATION_MULTIPLIER,
                                easing: Easing.quadIn,
                                loop: false
                            }
                        }
                    };

                    const scaleYAnimation = {
                        start: 1.0,
                        end: direction === 1 || direction === 3 ? 1.0 : 0.6,
                        duration: 0.2 * this.DURATION_MULTIPLIER,
                        easing: Easing.quadOut,
                        loop: false,
                        next: {
                            start: direction === 1 || direction === 3 ? 1.0 : 0.6,
                            end: 2.5,
                            duration: 0.2 * this.DURATION_MULTIPLIER,
                            easing: Easing.quadIn,
                            loop: false,
                            next: {
                                start: 2.5,
                                end: 1.0,
                                duration: 0.2 * this.DURATION_MULTIPLIER,
                                easing: Easing.quadIn,
                                loop: false
                            }
                        }
                    };

                    this.display.addValueAnimation(tileId, {
                    x: firstMove,
                        y: firstMoveY,
                        scaleSymbolX: scaleXAnimation,
                        scaleSymbolY: scaleYAnimation
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