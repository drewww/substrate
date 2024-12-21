import { World } from '../world/world';
import { Point } from '../types';
import { Entity } from '../entity/entity';
import { logger } from '../display/util/logger';

export type EngineMode = 'realtime' | 'turnbased';

export interface EngineConfig {
    mode: EngineMode;
    updateInterval?: number;
    worldWidth: number;
    worldHeight: number;
    player: Entity;
}

export type GameAction = {
    type: 'move';
    position: Point;
}

export class Engine {
    private world: World;
    private mode: EngineMode;
    private updateInterval: number;
    private lastUpdateTime: number = 0;
    private queuedActions: GameAction[] = [];
    private isRunning: boolean = false;
    private player: Entity;

    constructor(config: EngineConfig) {
        this.mode = config.mode;
        this.updateInterval = config.updateInterval || (1000/60);
        this.world = new World(config.worldWidth, config.worldHeight);
        this.player = config.player;
        
        this.world.addEntity(this.player);
    }

    public start(): void {
        this.isRunning = true;
        this.lastUpdateTime = performance.now();
    }

    public stop(): void {
        this.isRunning = false;
    }

    public update(timestamp: number): void {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = timestamp;

        this.processActions();

        for (const entity of this.world.getEntities()) {
            if ('update' in entity) {
                (entity as any).update(deltaTime);
            }
        }
    }

    public handleAction(action: GameAction): void {
        this.queuedActions.push(action);
    }

    private processActions(): void {
        while (this.queuedActions.length > 0) {
            const action = this.queuedActions.shift()!;
            
            if (action.type === 'move') {
                try {
                    this.world.moveEntity(this.player.getId(), action.position);
                } catch (e) {
                    logger.warn(`Failed to move player:`, e);
                }
            }
        }
    }

    public getWorld(): World {
        return this.world;
    }

    public getPlayer(): Entity {
        return this.player;
    }
} 