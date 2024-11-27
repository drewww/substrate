import { FillDirection, LogLevel } from '../matrix-display';
import { TileId } from '../types';
import { BaseTest } from './base-test';

interface LaserBeam {
    points: Array<{x: number, y: number}>;
    progress: number;  // Progress along the precomputed path
    fadeStart: number;
}

export class LaserTest extends BaseTest {
    private lasers: LaserBeam[] = [];
    private laserTileIds: Set<TileId> = new Set();
    private readonly LASER_SPEED = 0.2; // Speed along the path
    private readonly FADE_SPEED = 0.02;
    private timeSinceLastLaser: number = 0;
    
    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 50,
            worldHeight: 25,
            viewportWidth: 50,
            viewportHeight: 25,
            cellSize: 24,
            logLevel
        });
    }

    getName(): string {
        return "laser";
    }

    getDescription(): string {
        return "Draws laser beams between random points";
    }

    private computeLaserPath(x0: number, y0: number, x1: number, y1: number): Array<{x: number, y: number}> {
        console.log(`Computing path from (${x0},${y0}) to (${x1},${y1})`);
        const points: Array<{x: number, y: number}> = [];
        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        
        let x = x0;
        let y = y0;

        while (true) {
            points.push({x, y});
            if (x === x1 && y === y1) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        console.log(`Path computed with ${points.length} points`);
        return points;
    }

    private addLaser() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        const startX = Math.floor(Math.random() * width);
        const startY = Math.floor(Math.random() * height);
        const endX = Math.floor(Math.random() * width);
        const endY = Math.floor(Math.random() * height);

        const laser: LaserBeam = {
            points: this.computeLaserPath(startX, startY, endX, endY),
            progress: 0,
            fadeStart: -1
        };
        
        console.log('Created laser:', laser);
        this.lasers.push(laser);
    }

    private updateLasers() {
        if (!this.isRunning) return;

        // Remove previous laser tiles
        this.laserTileIds.forEach(id => this.display.removeTile(id));
        this.laserTileIds.clear();

        this.lasers = this.lasers.filter(laser => {
            // Remove if fade is complete
            if (laser.fadeStart > 0 && laser.fadeStart <= 0.1) {
                return false;
            }

            if (laser.fadeStart === -1) {
                // Move along precomputed path
                laser.progress += this.LASER_SPEED;
                
                // When we reach the end, start fading
                if (laser.progress >= laser.points.length - 1) {
                    laser.fadeStart = 1.0;
                    laser.progress = laser.points.length - 1; // Stay at end point
                }
            } else if (laser.fadeStart > 0) {
                // Just decrease fade intensity, don't move progress
                laser.fadeStart -= this.FADE_SPEED;
            }

            if (laser.fadeStart === -1) {
                // Normal laser rendering during growth phase
                const tipIndex = Math.min(Math.floor(laser.progress), laser.points.length - 1);
                for (let i = Math.max(0, tipIndex - 4); i <= tipIndex; i++) {
                    const distanceFromTip = tipIndex - i;
                    const opacity = 1 - (distanceFromTip * 0.2);
                    const alpha = Math.floor(opacity * 255).toString(16).padStart(2, '0');
                    const point = laser.points[i];
                    
                    const tileId = this.display.createTile(
                        point.x,
                        point.y,
                        ' ',
                        '#00000000',
                        `#FF0000${alpha}`,
                        100,
                        1,
                        FillDirection.BOTTOM
                    );
                    this.laserTileIds.add(tileId);
                }
            } else {
                // Fade out the last 5 points of the path
                const endIndex = laser.points.length - 1;
                for (let i = endIndex; i > endIndex - 5 && i >= 0; i--) {
                    const distanceFromEnd = endIndex - i;
                    const opacity = laser.fadeStart * (1 - (distanceFromEnd * 0.2));
                    const alpha = Math.floor(Math.max(0, opacity * 255)).toString(16).padStart(2, '0');
                    const point = laser.points[i];
                    
                    const tileId = this.display.createTile(
                        point.x,
                        point.y,
                        ' ',
                        '#00000000',
                        `#FF0000${alpha}`,
                        100,
                        1,
                        FillDirection.BOTTOM
                    );
                    this.laserTileIds.add(tileId);
                }
            }

            return true;
        });

        // Add new laser if needed
        this.timeSinceLastLaser++;
        if (this.timeSinceLastLaser > 120) {
            this.addLaser();
            this.timeSinceLastLaser = 0;
        }

        // Single render call per frame
        this.display.render();
        requestAnimationFrame(() => this.updateLasers());
    }

    protected run(): void {
        console.log('Starting laser test');
        // Disable auto-render at start
        this.display.setAutoRender(false);
        
        this.display.clear();
        this.lasers = [];
        this.timeSinceLastLaser = 0;
        this.addLaser(); // Add first laser immediately
        this.updateLasers();
    }

    protected cleanup(): void {
        this.lasers = [];
        this.laserTileIds.forEach(id => this.display.removeTile(id));
        this.laserTileIds.clear();
    }
} 