import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { ActionHandler } from '../action/action-handler';
import { MoveAction } from '../game/test/basic-test-game';

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
    
    // Add performance metrics
    private metrics = {
        lastUpdateDuration: 0,
        averageUpdateDuration: 0,
        totalUpdates: 0,
        systemMetrics: new Map<number, { 
            lastDuration: number, 
            averageDuration: number 
        }>(),
        entityUpdateDuration: 0,
        averageEntityUpdateDuration: 0
    };

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

        const updateStart = performance.now();
        const deltaTime = (timestamp - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = timestamp;

        // Run systems first
        this.systems.forEach((system, index) => {
            const systemStart = performance.now();
            system(deltaTime);
            const systemDuration = performance.now() - systemStart;
            
            // Update system metrics
            let systemMetric = this.metrics.systemMetrics.get(index);
            if (!systemMetric) {
                systemMetric = { lastDuration: 0, averageDuration: 0 };
                this.metrics.systemMetrics.set(index, systemMetric);
            }
            systemMetric.lastDuration = systemDuration;
            systemMetric.averageDuration = (systemMetric.averageDuration * 0.95) + (systemDuration * 0.05);
        });

        // Time entity updates
        const entityStart = performance.now();
        for (const entity of this.options.world.getEntities()) {
            if ('update' in entity) {
                (entity as any).update(deltaTime);
            }
        }
        this.metrics.entityUpdateDuration = performance.now() - entityStart;
        this.metrics.averageEntityUpdateDuration = 
            (this.metrics.averageEntityUpdateDuration * 0.95) + (this.metrics.entityUpdateDuration * 0.05);

        // Update overall metrics
        this.metrics.lastUpdateDuration = performance.now() - updateStart;
        this.metrics.averageUpdateDuration = 
            (this.metrics.averageUpdateDuration * 0.95) + (this.metrics.lastUpdateDuration * 0.05);
        this.metrics.totalUpdates++;
    }

    handleAction(action: { type: string, position: Point }): void {
        if (!this.isRunning) return;

        if (action.type === 'move') {
            this.actionHandler.execute({
                type: 'move',
                entityId: this.options.player.getId(),
                data: { to: action.position }
            });
        }
    }

    getWorld(): World {
        return this.options.world;
    }

    getPlayer(): Entity {
        return this.options.player;
    }

    // Add method to get debug info
    public getDebugString(): string {
        return `Engine Stats:
├─ Update Time: ${this.metrics.lastUpdateDuration.toFixed(2)}ms (avg: ${this.metrics.averageUpdateDuration.toFixed(2)}ms)
├─ Entity Updates: ${this.metrics.entityUpdateDuration.toFixed(2)}ms (avg: ${this.metrics.averageEntityUpdateDuration.toFixed(2)}ms)
├─ Systems: ${this.systems.length}
${Array.from(this.metrics.systemMetrics.entries()).map(([index, metric]) => 
    `│  ├─ System ${index}: ${metric.lastDuration.toFixed(2)}ms (avg: ${metric.averageDuration.toFixed(2)}ms)`
).join('\n')}
└─ Total Updates: ${this.metrics.totalUpdates}`;
    }
} 