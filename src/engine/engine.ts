import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { ActionHandler } from '../action/action-handler';
import { EngineLoop } from './engine-loop';

// these imports should not be so deep in a non-game file. but too late to fix for now.
import { MoveAction } from '../game/basic-test-game';
import { TICK_MS } from '../game/constants';

export interface EngineOptions {
    mode: 'turn-based' | 'realtime';
    worldWidth: number;
    worldHeight: number;
    player: Entity;
    world: World;
}

export class Engine {
    private systems: (() => void)[] = [];
    private actionHandler: ActionHandler;
    private isRunning: boolean = false;
    private engineLoop: EngineLoop;
    
    // Add performance metrics
    private metrics = {
        lastUpdateDuration: 0,
        averageUpdateDuration: 0,
        totalUpdates: 0,
        updatesPerSecond: 0,
        lastUpsUpdate: performance.now(),
        updatesSinceLastUps: 0,
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
        
        // Create engine loop with 200ms timestep (5 Hz)
        this.engineLoop = new EngineLoop(
            TICK_MS,
            () => this.tick()
        );
    }

    public start(): void {
        this.isRunning = true;
        this.engineLoop.start();
    }

    public stop(): void {
        this.isRunning = false;
        this.engineLoop.stop();
    }

    addSystem(system: () => void): void {
        this.systems.push(system);
    }

    public tick(): void {
        if (!this.isRunning) return;

        // Update UPS counter
        this.metrics.updatesSinceLastUps++;
        const timeSinceLastUps = performance.now() - this.metrics.lastUpsUpdate;
        if (timeSinceLastUps >= 1000) {  // Update every second
            this.metrics.updatesPerSecond = (this.metrics.updatesSinceLastUps / timeSinceLastUps) * 1000;
            this.metrics.updatesSinceLastUps = 0;
            this.metrics.lastUpsUpdate = performance.now();
        }

        const updateStart = performance.now();

        // Run systems first
        this.systems.forEach((system, index) => {
            const systemStart = performance.now();
            system();
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
                (entity as any).update();
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
├─ Updates/sec: ${this.metrics.updatesPerSecond.toFixed(1)}
├─ Update Time: ${this.metrics.lastUpdateDuration.toFixed(2)}ms (avg: ${this.metrics.averageUpdateDuration.toFixed(2)}ms)
├─ Entity Updates: ${this.metrics.entityUpdateDuration.toFixed(2)}ms (avg: ${this.metrics.averageEntityUpdateDuration.toFixed(2)}ms)
├─ Systems: ${this.systems.length}
${Array.from(this.metrics.systemMetrics.entries()).map(([index, metric]) => 
    `│  ├─ System ${index}: ${metric.lastDuration.toFixed(2)}ms (avg: ${metric.averageDuration.toFixed(2)}ms)`
).join('\n')}
└─ Total Updates: ${this.metrics.totalUpdates}`;
    }
} 