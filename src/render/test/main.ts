import { Display } from '../../display/display';
import { World } from '../../world/world';
import { Renderer } from '../renderer';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { logger } from '../../display/util/logger';
import { DebugOverlay } from '../../display/test/debug-overlay';

const WORLD_WIDTH = 40;
const WORLD_HEIGHT = 30;
const CELL_SIZE = 20;

class WorldTest {
    private world: World;
    private display: Display;
    private renderer: Renderer;
    private debugOverlay: DebugOverlay;
    private isRunning = false;
    private intervalId: number | null = null;

    constructor() {
        this.world = new World(WORLD_WIDTH, WORLD_HEIGHT);
        this.display = new Display({
            elementId: 'display',
            cellWidth: CELL_SIZE,
            cellHeight: CELL_SIZE,
            worldWidth: WORLD_WIDTH,
            worldHeight: WORLD_HEIGHT,
            viewportWidth: WORLD_WIDTH,
            viewportHeight: WORLD_HEIGHT
        });
        this.renderer = new Renderer(this.world, this.display);
        this.debugOverlay = new DebugOverlay(this.display);

        this.setupControls();
        this.updateStats();
    }

    private setupControls() {
        document.getElementById('addEntity')?.addEventListener('click', () => this.addRandomEntity());
        document.getElementById('removeRandom')?.addEventListener('click', () => this.removeRandomEntity());
        document.getElementById('toggleRandom')?.addEventListener('click', () => this.toggleRandom());
        document.getElementById('toggleDebug')?.addEventListener('click', () => this.debugOverlay.toggle());
    }

    private getRandomPosition(): Point {
        return {
            x: Math.floor(Math.random() * WORLD_WIDTH),
            y: Math.floor(Math.random() * WORLD_HEIGHT)
        };
    }

    private addRandomEntity() {
        const entity = new Entity(this.getRandomPosition());
        this.world.addEntity(entity);
        this.updateStats();
    }

    private removeRandomEntity() {
        const entities = this.world.getEntities();
        if (entities.length > 0) {
            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            this.world.removeEntity(randomEntity.getId());
            this.updateStats();
        }
    }

    private toggleRandom() {
        this.isRunning = !this.isRunning;
        if (this.isRunning) {
            this.intervalId = window.setInterval(() => {
                if (Math.random() < 0.7) {
                    this.addRandomEntity();
                } else {
                    this.removeRandomEntity();
                }
            }, 500);
        } else if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private updateStats() {
        const stats = document.getElementById('stats');
        if (stats) {
            stats.textContent = `Entities: ${this.world.getEntities().length}`;
        }
    }
}

// Start the test when the page loads
window.addEventListener('load', () => {
    logger.info('World Renderer Test Environment Loading...');
    try {
        new WorldTest();
        logger.info('World Renderer Test Environment Ready');
    } catch (error) {
        logger.error('Error initializing World Renderer Test:', error);
    }
}); 