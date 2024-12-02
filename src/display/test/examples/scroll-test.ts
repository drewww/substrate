import { BaseTest } from './base-test';
import { Color, TileId } from '../display/types';
import { LogLevel } from '../display/display';

interface Point {
    x: number;
    y: number;
}

export class ScrollTest extends BaseTest {
    private currentPos: Point = { x: 0, y: 0 };
    private targetPos: Point = { x: 0, y: 0 };
    private readonly WORLD_SIZE = 100;
    private readonly MOVE_SPEED = 1;
    private tileIds: TileId[] = [];
    
    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 100,
            worldHeight: 50,
            viewportWidth: 70,
            viewportHeight: 25,
            cellSize: 24,
            logLevel
        });
    }

    getName(): string {
        return "scroll";
    }

    getDescription(): string {
        return "Scrolls viewport around a larger world, moving between random destinations";
    }

    private getRandomASCII(): string {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }

    private getPositionBasedColor(x: number, y: number): Color {
        // Map x to hue (0-360)
        const hue = (x / this.WORLD_SIZE) * 360;
        // Map y to saturation (40-100%)
        const saturation = Math.floor(40 + (y / this.WORLD_SIZE) * 60);
        console.log(`Position (${x},${y}) -> HSL(${hue}, ${saturation}%, 50%)`);
        return this.hslToHex(hue, saturation, 50);
    }

    private hslToHex(h: number, s: number, l: number): Color {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}FF`;
    }

    private fillWorld() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileId = this.display.createTile(
                    x,
                    y,
                    this.getRandomASCII(),
                    '#FFFFFFFF',
                    this.getPositionBasedColor(x, y),
                    1
                );
                this.tileIds.push(tileId);
            }
        }
    }

    private getNewTarget(): Point {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        return {
            x: Math.floor(Math.random() * width),
            y: Math.floor(Math.random() * height)
        };
    }

    private moveTowardsTarget() {
        if (!this.isRunning) return;

        const oldX = this.currentPos.x;
        const oldY = this.currentPos.y;

        // Move in cardinal directions towards target
        if (this.currentPos.x < this.targetPos.x) this.currentPos.x += this.MOVE_SPEED;
        if (this.currentPos.x > this.targetPos.x) this.currentPos.x -= this.MOVE_SPEED;
        if (this.currentPos.y < this.targetPos.y) this.currentPos.y += this.MOVE_SPEED;
        if (this.currentPos.y > this.targetPos.y) this.currentPos.y -= this.MOVE_SPEED;

        // Log movement
        if (oldX !== this.currentPos.x || oldY !== this.currentPos.y) {
            console.log(`Moving viewport from (${oldX},${oldY}) to (${this.currentPos.x},${this.currentPos.y})`);
            console.log(`Target is (${this.targetPos.x},${this.targetPos.y})`);
            
            // Update viewport position
            this.display.setViewport(this.currentPos.x, this.currentPos.y);
        }

        // If we've reached the target, get a new one
        if (Math.abs(this.currentPos.x - this.targetPos.x) < this.MOVE_SPEED && 
            Math.abs(this.currentPos.y - this.targetPos.y) < this.MOVE_SPEED) {
            console.log('Reached target, getting new target');
            this.targetPos = this.getNewTarget();
        }

        requestAnimationFrame(() => this.moveTowardsTarget());
    }

    protected run(): void {
        console.log('Starting scroll test');
        this.currentPos = { x: 0, y: 0 };
        this.targetPos = this.getNewTarget();
        console.log(`Initial target: (${this.targetPos.x},${this.targetPos.y})`);
        this.fillWorld();
        this.moveTowardsTarget();
    }

    protected cleanup(): void {
        // Remove all tiles
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
        
        // Reset viewport position
        this.currentPos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };
        this.display.setViewport(0, 0);
    }
} 