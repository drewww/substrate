import { Entity } from './entity';
import { Point } from '../types';
import { SymbolComponent } from './component';

export class EnemyEntity extends Entity {
    private lastMoveTime: number = 0;
    private moveCooldown: number = 4000; // 4 seconds in milliseconds

    constructor(position: Point) {
        super(position);
        this.setComponent(new SymbolComponent(
            'E',             // char
            '#FF0000',      // red foreground
            'transparent',   // transparent background
            1               // standard z-index
        ));
    }

    public update(deltaTime: number): void {
        const now = performance.now();
        if (now - this.lastMoveTime >= this.moveCooldown) {
            this.lastMoveTime = now;
            // Movement will be handled by the game/engine
            this.onMoveReady?.();
        }
    }

    // Optional callback for when movement is ready
    private onMoveReady?: () => void;
    public setMoveReadyCallback(callback: () => void): void {
        this.onMoveReady = callback;
    }
} 