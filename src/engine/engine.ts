import { World } from '../world/world';
import { Point } from '../types';
import { Entity } from '../entity/entity';

export type EngineMode = 'realtime' | 'turnbased';

export interface EngineConfig {
    mode: EngineMode;
    updateInterval?: number;
    worldWidth: number;
    worldHeight: number;
    player: Entity;
    world: World;
}

export type GameAction = {
    type: 'move';
    position: Point;
}

export type SystemUpdateFn = (deltaTime: number) => void;

export class Engine {
    private world: World;
    private lastUpdateTime: number = 0;
    private queuedActions: GameAction[] = [];
    private isRunning: boolean = false;
    private player: Entity;
    private systems: SystemUpdateFn[] = [];

    constructor(config: EngineConfig) {
        this.world = config.world;
        this.player = config.player;
        
        this.start();
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

        for (const system of this.systems) {
            system(deltaTime);
        }

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
                    // logger.warn(`Failed to move player:`, e);
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

    public addSystem(system: SystemUpdateFn): void {
        this.systems.push(system);
    }
} 