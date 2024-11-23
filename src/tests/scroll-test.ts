import { BaseTest } from './base-test';
import { Color, Tile } from '../types';

interface Point {
    x: number;
    y: number;
}

export class ScrollTest extends BaseTest {
    private currentPos: Point = { x: 0, y: 0 };
    private targetPos: Point = { x: 0, y: 0 };
    private readonly WORLD_SIZE = 100; // Larger than viewport
    private readonly MIN_DISTANCE = 10;
    
    getName(): string {
        return "scroll";
    }

    getDescription(): string {
        return "Scrolls viewport around a larger world, moving between random destinations";
    }

    private getRandomASCII(): string {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }

    private getRandomColor(): Color {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
    }

    private fillWorld() {
        for (let y = 0; y < this.WORLD_SIZE; y++) {
            for (let x = 0; x < this.WORLD_SIZE; x++) {
                const tile: Tile = {
                    symbol: this.getRandomASCII(),
                    fgColor: this.getRandomColor(),
                    bgColor: this.getRandomColor(),
                    zIndex: 1
                };
                this.display.setTile(x, y, tile);
            }
        }
        this.display.render();
    }

    private getNewTarget(): Point {
        let newTarget: Point;
        do {
            newTarget = {
                x: Math.floor(Math.random() * (this.WORLD_SIZE - 50)),
                y: Math.floor(Math.random() * (this.WORLD_SIZE - 50))
            };
        } while (
            Math.abs(newTarget.x - this.currentPos.x) < this.MIN_DISTANCE &&
            Math.abs(newTarget.y - this.currentPos.y) < this.MIN_DISTANCE
        );
        return newTarget;
    }

    private moveTowardsTarget() {
        if (!this.isRunning) return;

        // Move one step in each needed direction
        if (this.currentPos.x < this.targetPos.x) this.currentPos.x++;
        if (this.currentPos.x > this.targetPos.x) this.currentPos.x--;
        if (this.currentPos.y < this.targetPos.y) this.currentPos.y++;
        if (this.currentPos.y > this.targetPos.y) this.currentPos.y--;

        // Update viewport
        this.display.setViewport(this.currentPos.x, this.currentPos.y);

        // If we've reached the target, get a new one
        if (this.currentPos.x === this.targetPos.x && 
            this.currentPos.y === this.targetPos.y) {
            this.targetPos = this.getNewTarget();
        }

        if (this.isRunning) {
            requestAnimationFrame(() => this.moveTowardsTarget());
        }
    }

    protected run(): void {
        this.currentPos = { x: 0, y: 0 };
        this.targetPos = this.getNewTarget();
        this.fillWorld();
        this.moveTowardsTarget();
    }

    protected cleanup(): void {
        this.currentPos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };
    }
} 