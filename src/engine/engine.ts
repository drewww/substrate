import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { ActionHandler, MoveAction } from '../action/action-handler';

export interface EngineOptions {
    mode: 'turn-based' | 'realtime';
    worldWidth: number;
    worldHeight: number;
    player: Entity;
    world: World;
}

export class Engine {
    private systems: ((deltaTime: number) => void)[] = [];
    private actionHandler: ActionHandler;
    private isRunning: boolean = false;
    private lastUpdateTime: number = 0;

    constructor(private options: EngineOptions) {
        this.actionHandler = new ActionHandler(options.world);
        this.actionHandler.registerAction('move', MoveAction);
        this.start();
    }

    public start(): void {
        this.isRunning = true;
        this.lastUpdateTime = performance.now();
    }

    public stop(): void {
        this.isRunning = false;
    }

    addSystem(system: (deltaTime: number) => void): void {
        this.systems.push(system);
    }

    update(timestamp: number): void {
        if (!this.isRunning) return;

        const deltaTime = (timestamp - this.lastUpdateTime) / 1000; // Convert to seconds
        this.lastUpdateTime = timestamp;

        // Run systems first
        for (const system of this.systems) {
            system(deltaTime);
        }

        // Update entities that have an update method
        for (const entity of this.options.world.getEntities()) {
            if ('update' in entity) {
                (entity as any).update(deltaTime);
            }
        }
    }

    handleAction(action: { type: string, position: Point }): void {
        if (!this.isRunning) return;

        if (action.type === 'move') {
            this.actionHandler.execute({
                type: 'move',
                entityId: this.options.player.getId(),
                to: action.position
            });
        }
    }

    getWorld(): World {
        return this.options.world;
    }

    getPlayer(): Entity {
        return this.options.player;
    }
} 