import { BaseTest } from './base-test';
import { Color, TileId } from '../../types';
import { logger } from '../../../util/logger';

interface Point {
    x: number;
    y: number;
}

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 200;


export class ScrollTest extends BaseTest {
    private currentPos: Point = { x: 0, y: 0 };
    private targetPos: Point = { x: 0, y: 0 };
    private readonly MOVE_SPEED = 1;
    private tileIds: TileId[] = [];
    
    constructor() {
        super({
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            viewportWidth: 20,
            viewportHeight: 10,
            cellWidth: 12,
            cellHeight: 24
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
        const hue = (x / WORLD_WIDTH) * 360;
        const saturation = Math.floor(10 + (y / WORLD_HEIGHT) * 90);
        logger.debug(`Position (${x},${y}) -> HSL(${hue}, ${saturation}%, 50%)`);
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
            logger.debug(`Moving viewport from (${oldX},${oldY}) to (${this.currentPos.x},${this.currentPos.y})`);
            logger.debug(`Target is (${this.targetPos.x},${this.targetPos.y})`);
            
            this.display.setViewport(this.currentPos.x, this.currentPos.y);
        }

        // If we've reached the target, get a new one
        if (Math.abs(this.currentPos.x - this.targetPos.x) < this.MOVE_SPEED && 
            Math.abs(this.currentPos.y - this.targetPos.y) < this.MOVE_SPEED) {
            logger.info('Reached target, getting new target');
            this.targetPos = this.getNewTarget();
        }

        requestAnimationFrame(() => this.moveTowardsTarget());
    }

    protected run(): void {
        logger.info('Starting scroll test');
        
        // Add render canvas to DOM for debugging
        const renderCanvas = this.display.getRenderCanvas();
        if (renderCanvas) {
            // Calculate actual pixel dimensions based on viewport size + 20%
            const renderWidthPx = this.options.cellWidth * Math.ceil(this.options.viewportWidth * 1.2);
            const renderHeightPx = this.options.cellHeight * Math.ceil(this.options.viewportHeight * 1.2);
            
            renderCanvas.style.position = 'fixed';
            renderCanvas.style.top = '10px';
            renderCanvas.style.right = '10px';
            renderCanvas.style.border = '1px solid #666';
            renderCanvas.style.opacity = '0.8';
            // Set dimensions to match viewport aspect ratio
            renderCanvas.style.width = `${renderWidthPx}px`;
            renderCanvas.style.height = `${renderHeightPx}px`;
            document.body.appendChild(renderCanvas);
        }

        this.currentPos = { x: 0, y: 0 };
        this.targetPos = this.getNewTarget();
        logger.info(`Initial target: (${this.targetPos.x},${this.targetPos.y})`);
        this.fillWorld();
        this.moveTowardsTarget();
    }

    protected cleanup(): void {
        // Remove render canvas from DOM
        const renderCanvas = this.display.getRenderCanvas();
        if (renderCanvas && renderCanvas.parentElement) {
            renderCanvas.parentElement.removeChild(renderCanvas);
        }

        // Original cleanup
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
        this.currentPos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };
        this.display.setViewport(0, 0);
    }
} 