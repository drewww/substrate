import { Display } from '../../display/display';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { logger } from '../../util/logger';
import { DebugOverlay } from '../../display/test/debug-overlay';
import { WorldDebugOverlay } from '../../world/debug-overlay';
import { SmokeBombEntity } from './smoke-bomb';
import { GameRenderer } from './game-renderer';
import { SymbolComponent } from '../../entity/components/symbol-component';

const WORLD_WIDTH = 40;
const WORLD_HEIGHT = 30;
const CELL_SIZE = 20;
const LOG_LEVEL_KEY = 'world-renderer-log-level';

class WorldTest {
    private world: World;
    private display: Display;
    private renderer: GameRenderer;
    private debugOverlay: DebugOverlay;
    private isRunning = false;
    private intervalId: number | null = null;
    private worldDebug: WorldDebugOverlay;
    private lastFrameTime: number = 0;
    private cursorTileId: string | null = null;

    constructor() {
        this.setupLogLevel();
        logger.info('Initializing World Renderer Test...');

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

        this.display.setBackground(' ', '#000000FF', '#000000FF');

        this.renderer = new GameRenderer(this.world, this.display);
        
        // Initialize debug overlays
        const displayDebugElement = document.getElementById('display-debug');
        const worldDebugElement = document.getElementById('world-debug');
        
        if (!displayDebugElement || !worldDebugElement) {
            throw new Error('Debug overlay elements not found');
        }

        this.debugOverlay = new DebugOverlay(this.display, displayDebugElement);
        this.worldDebug = new WorldDebugOverlay(this.world, worldDebugElement);

        // Show debug overlays by default
        this.debugOverlay.toggle();
        this.worldDebug.toggle();

        this.setupControls();
        logger.info('World Renderer Test initialized');

        // Start the update loop
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.update.bind(this));

        // Add click handler
        this.display.onCellClick((worldPos) => {
            const smokeBomb = new SmokeBombEntity(worldPos);
            this.world.addEntity(smokeBomb);
        });

        // Add hover handler for cursor highlight
        this.display.onCellHover((worldPos) => {
            // Remove existing cursor tile
            if (this.cursorTileId) {
                this.display.removeTile(this.cursorTileId);
                this.cursorTileId = null;
            }

            // Create new cursor tile at new position
            if (worldPos) {
                const cursorEntity = new Entity(worldPos);
                cursorEntity.setComponent(new SymbolComponent(
                    ' ',           // Empty character
                    'transparent', // transparent foreground
                    '#0088FF22',  // Light blue with 13% opacity
                    1000          // Very high z-index to stay on top
                ));
                this.cursorTileId = this.display.createTile(
                    worldPos.x,
                    worldPos.y,
                    ' ',
                    'transparent',
                    '#0088FF22',
                    1000
                );
            }
        });
    }

    private setupLogLevel() {
        const logLevelSelect = document.getElementById('logLevel') as HTMLSelectElement;
        
        // Restore saved log level
        const savedLogLevel = localStorage.getItem(LOG_LEVEL_KEY);
        if (savedLogLevel !== null) {
            const level = parseInt(savedLogLevel);
            logLevelSelect.value = level.toString();
            logger.setLogLevel(level);
        }

        logLevelSelect.addEventListener('change', (e) => {
            const level = parseInt((e.target as HTMLSelectElement).value);
            logger.setLogLevel(level);
            localStorage.setItem(LOG_LEVEL_KEY, level.toString());
            logger.info(`Log level set to ${level}`);
        });
    }

    private setupControls() {
        document.getElementById('addEntity')?.addEventListener('click', () => this.addRandomEntity());
        document.getElementById('removeRandom')?.addEventListener('click', () => this.removeRandomEntity());
        document.getElementById('toggleRandom')?.addEventListener('click', () => this.toggleRandom());
        document.getElementById('toggleDisplayDebug')?.addEventListener('click', () => this.debugOverlay.toggle());
        document.getElementById('toggleWorldDebug')?.addEventListener('click', () => this.worldDebug.toggle());
        document.getElementById('addSmokeBomb')?.addEventListener('click', () => {
            const x = Math.floor(Math.random() * WORLD_WIDTH);
            const y = Math.floor(Math.random() * WORLD_HEIGHT);
            const smokeBomb = new SmokeBombEntity({ x, y });
            this.world.addEntity(smokeBomb);
        });
        
        // Add fill world handler with batching
        document.getElementById('fillWorld')?.addEventListener('click', () => {
            this.world.startBatch();
            for (let x = 0; x < WORLD_WIDTH; x++) {
                for (let y = 0; y < WORLD_HEIGHT; y++) {
                    const smokeBomb = new SmokeBombEntity({ x, y });
                    this.world.addEntity(smokeBomb);
                }
            }
            this.world.endBatch();
        });
    }

    private getRandomPosition(): Point {
        return {
            x: Math.floor(Math.random() * WORLD_WIDTH),
            y: Math.floor(Math.random() * WORLD_HEIGHT)
        };
    }

    private addRandomEntity() {
        const entity = new Entity(this.getRandomPosition());
        entity.setComponent(new SymbolComponent('@')); // Add default symbol
        this.world.addEntity(entity);
    }

    private removeRandomEntity() {
        const entities = this.world.getEntities();
        if (entities.length > 0) {
            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            this.world.removeEntity(randomEntity.getId());
        }
    }

    private moveRandomEntity() {
        const entities = this.world.getEntities();
        if (entities.length > 0) {
            const entity = entities[Math.floor(Math.random() * entities.length)];
            const currentPos = entity.getPosition();
            
            // Pick a random orthogonal direction
            const directions = [
                { x: 0, y: -1 }, // up
                { x: 1, y: 0 },  // right
                { x: 0, y: 1 },  // down
                { x: -1, y: 0 }  // left
            ];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            
            const newPos = {
                x: Math.max(0, Math.min(WORLD_WIDTH - 1, currentPos.x + direction.x)),
                y: Math.max(0, Math.min(WORLD_HEIGHT - 1, currentPos.y + direction.y))
            };
            
            logger.debug(`Moving entity ${entity.getId()} from (${currentPos.x},${currentPos.y}) to (${newPos.x},${newPos.y})`);
            this.world.moveEntity(entity.getId(), newPos);
        }
    }

    private toggleRandom() {
        this.isRunning = !this.isRunning;
        if (this.isRunning) {
            this.intervalId = window.setInterval(() => {
                const action = Math.random();
                if (action < 0.4) {          // 40% chance to add
                    this.addRandomEntity();
                } else if (action < 0.6) {   // 20% chance to remove
                    this.removeRandomEntity();
                } else {                     // 40% chance to move
                    this.moveRandomEntity();
                }
            }, 500);
        } else if (this.intervalId !== null) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private update(timestamp: number) {
        const deltaTime = (timestamp - this.lastFrameTime) / 1000; // Convert to seconds
        this.lastFrameTime = timestamp;

        // Start batching events
        this.world.startBatch();

        // Update all entities
        for (const entity of this.world.getEntities()) {
            if ('update' in entity) {
                (entity as any).update(deltaTime);
            }
        }

        // End batching and flush events
        this.world.endBatch();

        // Continue the loop
        requestAnimationFrame(this.update.bind(this));
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