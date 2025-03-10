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
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { LightEmitterComponent } from '../../entity/components/light-emitter-component';
import { LightAnimationType } from '../light-animations';
import { WallComponent, WallDirection } from '../../entity/components/wall-component';

const WORLD_WIDTH = 40;
const WORLD_HEIGHT = 30;
const CELL_SIZE = 20;
const LOG_LEVEL_KEY = 'world-renderer-log-level';
const WALL_DENSITY = 0.1; // 10% of tiles will be walls

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
    private wanderingLightId: string | null = null;
    private wanderingLightInterval: number | null = null;
    private wallStates: Map<string, WallDirection[]> = new Map();  // Track wall states per position
    private keyStates: Set<string>;

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

        this.display.setBackground('.', '#222222FF', '#000000FF');

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
            if (!worldPos) return;  // Early return if no position
            
            const entityType = (document.getElementById('entityType') as HTMLSelectElement).value;
            
            if (entityType === 'wall') {
                this.handleWallPlacement(worldPos);  // Pass the non-null position
                return;
            }

            let entity;
            if (entityType === 'smokeBomb') {
                entity = new SmokeBombEntity(worldPos);
            } else if (entityType === 'light') {
                // const animationTypes: LightAnimationType[] = ['pulse-intensity', 'pulse-radius', 'strobe'];

                // const animationTypes: LightAnimationType[] = ['pulse-radius', 'flicker', 'strobe', 'pulse-intensity'];
                const animationTypes: LightAnimationType[] = ['rgb'];
                const randomAnimation = animationTypes[Math.floor(Math.random() * animationTypes.length)];
                
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '*',                // character
                    '#ffff00',          // foreground color
                    '#00000000',        // transparent background
                    50                  // z-index below light effect
                ));
                entity.setComponent(new LightEmitterComponent({
                    radius: 8,
                    intensity: 0.3,
                    color: '#ffff00',
                    distanceFalloff: 'quadratic',
                    lightSourceTile: false,
                    animation: {
                        type: randomAnimation,
                        params: {
                            speed: Math.random() < 0.3 ? 'fast' : 
                                  Math.random() < 0.6 ? 'slow' : 'normal',
                            intensity: 0.5 + Math.random() * 0.5  // Random intensity between 0.5 and 1.0
                        }
                    }
                }));
            } else if (entityType === 'spotlight') {
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '◆',                // diamond character for spotlight
                    '#ffff00',          // yellow foreground
                    '#00000000',        // transparent background
                    50                  // z-index below light effect
                ));
                
                // const randomFacing = Math.random() * Math.PI * 2; // Random angle 0-2π
                const randomFacing = Math.PI/2;
                const randomWidth = Math.PI/2;

                entity.setComponent(new LightEmitterComponent({
                    radius: 10,
                    intensity: 1.0,
                    color: '#ffffff',    // White light
                    distanceFalloff: 'step',
                    facing: randomFacing,
                    width: randomWidth,
                    mode: 'fg',
                    animation: {
                        type: 'rotate',
                        params: {
                            speed: 'normal'
                        }
                    }
                }));
            } else if (entityType === 'spin') {
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '✦',                // sparkle character
                    '#ffff00',          // yellow foreground
                    '#00000000',        // transparent background
                    50                  // z-index below light effect
                ));
                entity.setComponent(new LightEmitterComponent({
                    radius: 2,
                    intensity: 0.2,
                    color: '#ffff00',
                    distanceFalloff: 'linear',
                    lightSourceTile: false,
                    animation: {
                        type: 'offset-rotate',
                        params: {
                            speed: 'normal'
                        }
                    }
                }));
            } else if (entityType === 'flicker') {
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '🔥',               // fire emoji or could use '§' as alternative
                    '#ffa500',          // orange foreground
                    '#00000000',        // transparent background
                    50                  // z-index below light effect
                ));
                entity.setComponent(new LightEmitterComponent({
                    radius: 10,
                    intensity: 0.4,
                    color: '#ffa500',    // Orange light
                    distanceFalloff: 'quadratic',
                    mode: 'fg',
                    animation: {
                        type: 'flicker',
                        params: {
                            speed: 'normal',
                            intensity: 1.0
                        }
                    }
                }));
            } else if (entityType === 'chargedShot') {
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '^',                // Diamond with dot character
                    '#00ffff',          // cyan foreground
                    '#00000000',        // transparent background
                    50                  // z-index below light effect
                ));
                entity.setComponent(new LightEmitterComponent({
                    radius: 5,          // Starts small
                    intensity: 0.0,     // Starts dim
                    color: '#00ffff',   // Cyan light
                    distanceFalloff: 'step',
                    facing: Math.PI/2,  // Face upward
                    width: 0,     // Start wide
                    removeOnComplete: true,
                    animation: {
                        type: 'charge-shoot'
                    }
                }));


                // add another entity for aoe charge shoot
                const aoeChargeShoot = new Entity(worldPos);

                aoeChargeShoot.setComponent(new LightEmitterComponent({
                    radius: 1,
                    intensity: 1.0,
                    color: '#00ffff',
                    mode: 'fg',
                    removeOnComplete: true,
                    distanceFalloff: 'linear',
                    animation: {
                        type: 'aoe-charge-shoot'
                    }
                }));
                this.world.addEntity(aoeChargeShoot);
            } else if (entityType === 'serifTest') {
                entity = new Entity(worldPos);
                entity.setComponent(new SymbolComponent(
                    '@',                // character
                    '#FFFFFF',          // white foreground
                    '#00000000',        // transparent background
                    50,                 // z-index
                    false,              // alwaysRenderIfExplored
                    0,                  // rotation
                    0,                  // offsetSymbolX
                    0,                  // offsetSymbolY
                    1.0,               // scaleSymbolX
                    1.0,               // scaleSymbolY
                    'bold',            // fontWeight
                    'italic',          // fontStyle
                    'serif'            // fontFamily
                ));
            }

            if (entity) {
                this.world.addEntity(entity);
            }
        });

        // Add hover handler for cursor highlight
        this.display.onCellHover((worldPos) => {
            // Remove existing cursor tile
            if (this.cursorTileId) {
                this.display.removeTile(this.cursorTileId);
                this.cursorTileId = null;
            }

            // Create new cursor tile at new position
            if (worldPos) {  // Only create new tile if we have a position
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

        // Add random walls
        this.addRandomWalls();

        // Update controls setup
        this.setupControls();
        this.setupEntityTypeSelector();

        // Add wandering light handler
        document.getElementById('toggleWanderingLight')?.addEventListener('click', () => {
            if (this.wanderingLightId) {
                // Stop the wandering light
                if (this.wanderingLightInterval) {
                    window.clearInterval(this.wanderingLightInterval);
                    this.wanderingLightInterval = null;
                }
                this.world.removeEntity(this.wanderingLightId);
                this.wanderingLightId = null;
            } else {
                // Create and start a wandering light
                const light = new Entity(this.getRandomPosition());
                light.setComponent(new SymbolComponent(
                    '*',
                    '#ffff00',
                    '#00000000',
                    50
                ));
                light.setComponent(new LightEmitterComponent({
                    radius: 5,
                    intensity: 0.7,
                    color: '#ffff00',
                    distanceFalloff: 'quadratic',
                    // animation: {
                    //     type: 'pulse-intensity',
                    //     params: {
                    //         speed: 'normal',
                    //         intensity: 1.0
                    //     }
                    // }
                }));
                
                this.world.addEntity(light);
                this.wanderingLightId = light.getId();

                // Move the light every 1000ms (giving 500ms for the animation)
                this.wanderingLightInterval = window.setInterval(() => {
                    if (!this.wanderingLightId) return;
                    
                    const entity = this.world.getEntity(this.wanderingLightId);
                    if (!entity) return;

                    const currentPos = entity.getPosition();
                    const directions = [
                        { x: 0, y: -1 },  // up
                        { x: 1, y: 0 },   // right
                        { x: 0, y: 1 },   // down
                        { x: -1, y: 0 }   // left
                    ];
                    
                    const direction = directions[Math.floor(Math.random() * directions.length)];
                    const newPos = {
                        x: Math.max(0, Math.min(WORLD_WIDTH - 1, currentPos.x + direction.x)),
                        y: Math.max(0, Math.min(WORLD_HEIGHT - 1, currentPos.y + direction.y))
                    };
                    
                    this.world.moveEntity(this.wanderingLightId, newPos);
                }, 1000);
            }
        });

        // Add keyboard state tracking
        this.keyStates = new Set();
        const keyToDirection = {
            'ArrowUp': WallDirection.NORTH,
            'ArrowDown': WallDirection.SOUTH,
            'ArrowLeft': WallDirection.WEST,
            'ArrowRight': WallDirection.EAST,
            'KeyW': WallDirection.NORTH,
            'KeyS': WallDirection.SOUTH,
            'KeyA': WallDirection.WEST,
            'KeyD': WallDirection.EAST,
        } as const;
        window.addEventListener('keydown', (e) => {
            if (Object.keys(keyToDirection).includes(e.key) || 
                Object.keys(keyToDirection).includes(e.code)) {
                e.preventDefault();
                this.keyStates.add(e.key);  // For arrow keys
                this.keyStates.add(e.code); // For WASD
            }
        });
        window.addEventListener('keyup', (e) => {
            this.keyStates.delete(e.key);   // For arrow keys
            this.keyStates.delete(e.code);  // For WASD
        });

        // Add font test entities
        // this.addFontTestEntities();
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

    private addRandomWalls(): void {
        this.world.startBatch();
        for (let x = 0; x < WORLD_WIDTH; x++) {
            for (let y = 0; y < WORLD_HEIGHT; y++) {
                if (Math.random() < WALL_DENSITY) {
                    const wall = new Entity({ x, y });
                    wall.setComponent(new SymbolComponent('#', '#666', '#444'));
                    wall.setComponent(new OpacityComponent());
                    wall.setComponent(new ImpassableComponent());
                    this.world.addEntity(wall);
                }
            }
        }
        this.world.endBatch();
    }

    private setupEntityTypeSelector(): void {
        const select = document.createElement('select');
        select.id = 'entityType';
        
        const options = [
            { value: 'smokeBomb', label: 'Smoke Bomb' },
            { value: 'light', label: 'Light Source' },
            { value: 'spotlight', label: 'Spotlight' },
            { value: 'spin', label: 'Spinning Light' },
            { value: 'flicker', label: 'Flickering Light' },
            { value: 'chargedShot', label: 'Charged Shot' },
            { value: 'wall', label: 'Wall' },
            { value: 'serifTest', label: 'Serif Test' }  // Add new option
        ];

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });

        const container = document.getElementById('controls');
        if (container) {
            container.insertBefore(select, container.firstChild);
        }
    }

    private handleWallPlacement(pos: Point) {
        // Map arrow keys to wall directions
        const keyToDirection = {
            'ArrowUp': WallDirection.NORTH,
            'ArrowDown': WallDirection.SOUTH,
            'ArrowLeft': WallDirection.WEST,
            'ArrowRight': WallDirection.EAST,
            'KeyW': WallDirection.NORTH,
            'KeyS': WallDirection.SOUTH,
            'KeyA': WallDirection.WEST,
            'KeyD': WallDirection.EAST,
        } as const;

        // Check which arrow keys are pressed
        const pressedDirections = Object.entries(keyToDirection)
            .filter(([key]) => this.keyStates.has(key))
            .map(([_, direction]) => direction);

        if (pressedDirections.length === 0) {
            // If no arrow keys are pressed, do nothing
            return;
        }

        // Toggle each pressed direction
        for (const direction of pressedDirections) {
            const currentProperties = this.world.hasWall(pos, direction);
            logger.info(`Current properties: ${currentProperties}`);
            this.world.setWall(pos, direction, {
                properties: [!currentProperties[0], !currentProperties[1], false], // Only toggle first property
                color: '#888888'
            });
        }
    }

    private addFontTestEntities(): void {
        // Create a row of test characters with different font configurations
        const testChars = ['@', '&', '#', '%', '?', '!'];
        const y = Math.floor(WORLD_HEIGHT / 2);
        const startX = Math.floor(WORLD_WIDTH / 2 - testChars.length / 2);

        testChars.forEach((char, index) => {
            const entity = new Entity({ x: startX + index, y });
            entity.setComponent(new SymbolComponent(
                char,
                '#FFFFFF',          // White foreground
                '#00000000',        // Transparent background
                50,                 // z-index
                false,              // alwaysRenderIfExplored
                0,                  // rotation
                0,                  // offsetSymbolX
                0,                  // offsetSymbolY
                1.0,               // scaleSymbolX
                1.0,               // scaleSymbolY
                'bold',            // fontWeight
                'italic',          // fontStyle
                'serif'            // fontFamily
            ));
            this.world.addEntity(entity);
        });

        // Add a label above
        const labelEntity = new Entity({ x: startX, y: y - 1 });
        labelEntity.setComponent(new SymbolComponent(
            'Font Test',
            '#888888',          // Gray foreground
            '#00000000',        // Transparent background
            50,                 // z-index
            false,              // alwaysRenderIfExplored
            0,                  // rotation
            0,                  // offsetSymbolX
            0,                  // offsetSymbolY
            1.0,               // scaleSymbolX
            1.0,               // scaleSymbolY
            'normal',          // fontWeight
            'normal',          // fontStyle
            'monospace'        // fontFamily - using monospace for the label
        ));
        this.world.addEntity(labelEntity);
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