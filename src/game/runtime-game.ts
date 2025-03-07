import '../entity/components/index.ts';
import './components/index.ts';
import { ActionHandler, ActionClass, BaseAction } from '../action/action-handler.ts';
import { Display } from '../display/display.ts';
import { Easing } from '../display/types.ts';
import { Engine } from '../engine/engine.ts';
import { VisionComponent } from '../entity/components/vision-component.ts';
import { Entity } from '../entity/entity.ts';
import { BaseRenderer } from '../render/base-renderer.ts';
import { UISpeedRenderer } from '../render/ui-speed-renderer.ts';
import { Direction, Point } from '../types.ts';
import { logger } from '../util/logger.ts';
import { EnemyWorldGenerator } from '../world/generators/enemy-world-generator.ts';
import { World } from '../world/world.ts';
import { CreateEntityAction } from './actions/create-projectile.action.ts';
import { EntityMoveAction } from './actions/entity-movement.action.ts';
import { StunAction } from './actions/stun.action.ts';
import { BrakeComponent } from './components/brake.component.ts';
import { BufferedMoveComponent } from './components/buffered-move.component.ts';
import { CooldownComponent } from './components/cooldown.component.ts';
import { InertiaComponent } from './components/inertia.component.ts';
import { TurboComponent } from './components/turbo.component.ts';
import { RuntimeSoundRenderer } from './game-sound-renderer.ts';
import { Game } from './game.ts';
import { RuntimeRenderer } from './renderers/runtime-renderer.ts';
import { CooldownCleanupSystem } from './systems/cooldown-cleanup.system.ts';
import { CooldownSystem } from './systems/cooldown.system.ts';
import { EnemyAISystem } from './systems/enemy-ai.system.ts';
import { EnemyMovementSystem } from './systems/enemy-movement.system.ts';
import { FollowingSystem } from './systems/following.system.ts';
import { PlayerMovementSystem } from './systems/player-movement-system.ts';
import { WorldSystem } from './systems/world.system.ts';
import { JsonWorldGenerator } from '../world/generators/json-world-generator.ts';

import testWorldUrl from '../assets/world/test-world.json?url';
import { CityBlockGenerator } from './generators/city-block-generator.ts';
import { EntitySpawnAction } from './actions/entity-spawn.action.ts';
import { tileFlagsHasCardinalDirection } from 'wally-fov/lib/tile-flags';
import { MinimapRenderer } from './renderers/minimap-renderer.ts';
import { LightEmitterComponent } from '../entity/components/light-emitter-component.ts';
import { ObjectiveComponent } from './components/objective.component.ts';
import { VehicleLeaderComponent } from './components/vehicle-leader.component.ts';
import { FollowerComponent } from '../entity/components/follower-component.ts';
import { FacingComponent } from '../entity/components/facing-component.ts';
import { getOppositeDirection, getTargetPosition } from '../util.ts';
import { EnergyComponent } from './components/energy.component.ts';




const DEFAULT_INPUT_CONFIG = `
mode: game
==========
map: default
---
w move up
s move down
a move left
d move right
e shift up
q shift down
Space brake
Shift turbo
`;

export class RuntimeGame extends Game {

    // I don't love all these `!` but I'm not sure how else to do it with the async loading
    private enemyMovementSystem!: EnemyMovementSystem;
    private actionHandler!: ActionHandler;
    private cooldownSystem!: CooldownSystem;
    private playerMovementSystem!: PlayerMovementSystem;
    private worldSystem!: WorldSystem;
    private followingSystem!: FollowingSystem;
    private cooldownCleanupSystem!: CooldownCleanupSystem;
    private uiSpeedRenderer!: UISpeedRenderer;
    private enemyAISystem!: EnemyAISystem;
    private minimapDisplay!: Display;
    private minimapRenderer!: MinimapRenderer;
    private generator!: CityBlockGenerator;
    private objectiveCount: number = 0;

    constructor(private readonly canvasId: string) {
        super();
    }

    protected createDisplay(): Display {
        if (!this.world) {
            throw new Error('World must be initialized before creating display');
        }

        return new Display({
            elementId: this.canvasId,
            cellWidth: 20,
            cellHeight: 20,
            viewportWidth: 40,
            viewportHeight: 29,
            worldWidth: this.world.getWorldWidth(),
            worldHeight: this.world.getWorldHeight()
        });
    }

    protected setupRenderer(): void {
        if (!this.display || !this.renderer) {
            throw new Error('Display and renderer must be initialized');
        }

        (this.renderer as RuntimeRenderer).updateVisibility();

        // Attach render canvas to DOM for debugging
        const renderCanvas = this.display.getRenderCanvas();
        const existingRenderCanvas = document.getElementById('render-canvas');
        if (existingRenderCanvas) {
            existingRenderCanvas.replaceWith(renderCanvas);
        }
    }

    protected setupInput(): void {
        // Set up input configuration
        this.input.loadConfig(DEFAULT_INPUT_CONFIG);
        this.input.setMode('game');
    }

    protected setupSystems(): void {
        if (!this.world) {
            throw new Error('World not initialized');
        }

        if (!this.player) {
            throw new Error('Player not initialized');
        }

        if (!this.engine) {
            throw new Error('Engine not initialized');
        }

        // Initialize our systems
        this.cooldownSystem = new CooldownSystem(this.world);
        this.enemyAISystem = new EnemyAISystem(this.world, this.actionHandler);
        this.enemyMovementSystem = new EnemyMovementSystem(this.world, this.actionHandler);
        this.playerMovementSystem = new PlayerMovementSystem(this.world, this.actionHandler);
        this.worldSystem = new WorldSystem(this.world, this.actionHandler);
        this.followingSystem = new FollowingSystem(this.world, this.actionHandler);
        this.cooldownCleanupSystem = new CooldownCleanupSystem(this.world);

        // Add systems to engine update loop - cooldown system must run first
        this.engine.addSystem((totalUpdates) => {
            this.cooldownSystem.tick();
        });

        this.engine.addSystem((totalUpdates) => {
            this.enemyAISystem.tick(totalUpdates);
        });

        this.engine.addSystem((totalUpdates) => {
            this.enemyMovementSystem.tick();
        });

        this.engine.addSystem((totalUpdates) => {
            this.playerMovementSystem.tick();
        });

        this.engine.addSystem((totalUpdates) => {
            this.worldSystem.tick(totalUpdates);
        });

        this.engine.addSystem((totalUpdates) => {
            this.followingSystem.tick();
        });

        this.engine.addSystem((totalUpdates) => {
            this.cooldownCleanupSystem.tick();
        });


        this.world.on('player-death', (data: { entityId: string }) => {
            logger.warn('Player death:', data);
            this.engine?.stop();
            (this.renderer as RuntimeRenderer).displayMessage("GAME OVER");
        });

        this.world.on('objective-complete', (data: { objective: Entity }) => {
            // (this.renderer as RuntimeRenderer).displayMessage("DATA STOLEN");
            this.objectiveCount++;

            if (this.objectiveCount >= 2) {
                this.engine?.stop();
                (this.renderer as RuntimeRenderer).displayMessage("DATA STOLEN");
            }

            this.selectObjective(this.world!);
        });

    }

    protected createRenderer(): BaseRenderer {
        if (!this.world || !this.display) {
            throw new Error('World and display must be initialized');
        }

        return new RuntimeRenderer(this.display, this.world);
    }

    protected createSoundRenderer(): RuntimeSoundRenderer {
        if (!this.world || !this.player) {
            throw new Error('World and player must be initialized');
        }

        return new RuntimeSoundRenderer(this.world, this.audioContext);
    }

    protected async setup(): Promise<void> {
        try {
            // Load the world from JSON using the URL
            this.generator = new CityBlockGenerator();
            const world = await this.generator.generate();
            this.world = world;

            // Find the player entity that was created by the generator
            this.player = world.getEntitiesWithComponent('player')[0];

            // Add components to player
            const cooldowns = new CooldownComponent();
            cooldowns.setCooldown('move', 4, 4, false);
            this.player.setComponent(cooldowns);

            const inertia = new InertiaComponent(Direction.East, 0);
            this.player.setComponent(inertia);

            if (!this.player) {
                throw new Error('No player entity found in generated world');
            }

            // Initialize engine with the generated world
            this.engine = new Engine({
                mode: 'realtime',
                worldWidth: world.getWorldWidth(),
                worldHeight: world.getWorldHeight(),
                player: this.player,
                world: world
            });

            const visionComponent = this.player.getComponent('vision') as VisionComponent;
            const radius = visionComponent?.radius ?? 30; // fallback to 30 if no component
            this.world.updateVision(this.player.getPosition(), radius);

            // Set up action handler with new PlayerMoveAction
            this.actionHandler = new ActionHandler(this.world);
            this.actionHandler.registerAction('entityMove', EntityMoveAction);
            this.actionHandler.registerAction('stun', StunAction);
            this.actionHandler.registerAction('createProjectile', CreateEntityAction);
            this.actionHandler.registerAction('spawn', EntitySpawnAction);

            // Note: These setup calls will happen after display is created in prepare()
            // They are moved out of setup() and will be called after prepare() creates the display

            this.postProcessVehicles(this.world);
        } catch (error) {
            logger.error('Failed to load world:', error);
            // Fallback to EnemyWorldGenerator if JSON loading fails
            const fallbackGenerator = new EnemyWorldGenerator();
            this.world = fallbackGenerator.generate();
            this.player = this.world.getEntitiesWithComponent('player')[0];
        }
    }

    // Add a new method to handle post-display setup
    protected setupAfterDisplay(): void {
        if (!this.display || !this.world || !this.player) {
            throw new Error('Required game objects not initialized');
        }

        // Update initial visibility
        this.updateViewport(false);
        this.setupInput();
        this.setupRenderer();
        this.setupSystems();
        this.setupSpeedRenderer();

        // Set up world event handlers
        this.world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
            if (data.entity.hasComponent('player')) {
                this.updateViewport();
            }
        });
        // Set up cell inspection
        this.display.onCellClick((pos) => {
            if (!this.world || !pos) return;

            // First show tile information
            const tiles = this.display!.getTilesAt(pos.x, pos.y);
            if (tiles.length > 0) {
                logger.info(`Tiles at (${pos.x}, ${pos.y}):`);
                tiles.forEach(tile => {
                    logger.info(`- Symbol: "${tile.char}" | Color: ${tile.color} | Z-Index: ${tile.zIndex}`);
                });
            } else {
                logger.info(`No tiles at (${pos.x}, ${pos.y})`);
            }

            // Then show entity and component information
            const entities = this.world.getEntitiesAt(pos);
            if (entities.length > 0) {
                logger.info(`Entities at (${pos.x}, ${pos.y}):`);
                entities.forEach(entity => {
                    const components = entity.getComponents().map(c => c.type);
                    logger.info(`- Entity ${entity.getId()}: Components = [${components.join(', ')}]`);
                });
            }

            // Log the visibility mask
            const renderer = this.renderer as RuntimeRenderer;
            const visibilityMask = renderer.getVisibilityMask?.();
            if (visibilityMask) {
                logger.info('Visibility:', visibilityMask[pos.y][pos.x]);
            }

            // Log FOV information
            const fovMap = this.world.getFOVMap();
            logger.info('FOV Status:', {
                visible: this.world.isLocationVisible(pos),
                discovered: this.world.isLocationDiscovered(pos),
                maskValue: this.display!.getVisibilityMask()[pos.y][pos.x],
                hasBody: fovMap.getBody(pos.x, pos.y),
                hasWalls: fovMap.getWalls(pos.x, pos.y),
                tiles: this.display!.getTilesAt(pos.x, pos.y)
            });
        });

        // this.selectObjective(this.world);

        // Add minimap setup
        this.setupMinimap(this.world);
    }

    // Update the Game's prepare method to call setupAfterDisplay
    public async prepare(): Promise<void> {
        await super.prepare();
        this.setupAfterDisplay();
    }

    private pointToKey(point: Point): string {
        return `${point.x},${point.y}`;
    }


    private updateViewport(animate: boolean = true): void {
        if (!this.player || !this.world || !this.display) {
            throw new Error('Required game objects not initialized');
        }

        const pos = this.player.getPosition();
        const viewportWidth = this.display.getViewportWidth();
        const viewportHeight = this.display.getViewportHeight();

        // Center the viewport on the player
        const viewportX = Math.max(0, Math.min(
            pos.x - Math.floor(viewportWidth / 2),
            this.world.getWorldWidth() - viewportWidth
        ));
        const viewportY = Math.max(0, Math.min(
            pos.y - Math.floor(viewportHeight / 2),
            this.world.getWorldHeight() - viewportHeight
        ));

        this.display.setViewport(Math.floor(viewportX), Math.floor(viewportY), {
            smooth: animate,
            duration: 0.5,  // 100ms transition
            easing: Easing.linear
        });
        // this.display.setViewport(viewportX, viewportY);
    }

    protected handleInput(type: string, action: string, params: string[]): void {
        if (!this.player) {
            throw new Error('Player not initialized');
        }



        // reject "up" events, might help with some accidental post-tick activations

        // the problem is that you can "repeat" INTO the next tick and it's not
        // intentional. it's not even about tick, it's about where in the cooldown you are. 

        // maybe the play is that an "up" should cancel buffered move.

        logger.warn(`action: ${action} type: ${type}`);


        if (params.length > 0) {
            let direction: Direction;
            const directionStr = params[0];
            switch (directionStr) {
                case 'up': direction = Direction.North; break;
                case 'down': direction = Direction.South; break;
                case 'left': direction = Direction.West; break;
                case 'right': direction = Direction.East; break;
                default: return;
            }


            const inertia = this.player.getComponent('inertia') as InertiaComponent;
            if (action === 'move' && type === 'up' && inertia && inertia.magnitude > 1) {
                this.player.removeComponent('bufferedMove');
            } else if (action === 'move' && type === 'up' && inertia && inertia.magnitude <= 1) {
                this.player.setComponent(new BufferedMoveComponent(direction, true));
            }

            if (action === 'move' && type !== 'up') {
                this.player.removeComponent('bufferedMove');
                this.player.setComponent(new BufferedMoveComponent(direction));
            }
        }

        if (action === 'turbo' && (type === 'down' || type === 'repeat')) {
            const inertia = this.player.getComponent('inertia') as InertiaComponent;
            const turbo = this.player.getComponent('turbo') as TurboComponent;
            const energy = this.player.getComponent('energy') as EnergyComponent;

            logger.warn(`turbo: ${turbo} energy: ${energy?.energy}`);

            // Only allow turbo if we have enough speed AND enough energy
            if (inertia && inertia.magnitude >= 6 && !turbo && energy && energy.energy >= 10) {
                logger.warn('turbo engaged');
                this.player.setComponent(new TurboComponent());
            } else {
                // force decay if the turbo key is pressed but we can't actually use it here.

                // not sure if this is important. 
                // const inertia = this.player.getComponent('inertia') as InertiaComponent;
                // if (inertia && inertia.magnitude > 6) {
                //     inertia.magnitude -= 1;
                //     this.player.setComponent(inertia);
                // }
            }
        } else if (action === 'turbo' && (type === 'up')) {
            this.player.removeComponent('turbo');
            // Force speed decay when manually disengaging turbo
            const inertia = this.player.getComponent('inertia') as InertiaComponent;
            if (inertia && inertia.magnitude > 6) {
                inertia.magnitude -= 1;
                this.player.setComponent(inertia);
            }
        }

        logger.info(`action: ${action} type: ${type}`);
        if (action === 'brake' && (type === 'down' || type === 'repeat')) {
            // how do we handle conflict between brake and a move? I think brake takes precedence. add it to buffered move as a boolean.           
            this.player.setComponent(new BrakeComponent());
        } else if (action === 'brake' && (type === "up")) {
            this.player.removeComponent('brake');
        }
    }

    public getDisplay(): Display {
        if (!this.display) {
            throw new Error('Display not initialized');
        }
        return this.display;
    }

    public saveGame(): void {
        if (!this.world) {
            throw new Error('World not initialized');
        }

        const saveData = {
            world: this.world.serialize()
        };

        localStorage.setItem('gameState', JSON.stringify(saveData));
        console.log('Game saved');
    }

    public loadGame(): void {
        const savedState = localStorage.getItem('gameState');
        if (!savedState) {
            console.log('No saved game found');
            return;
        }

        try {
            const saveData = JSON.parse(savedState);
            const newWorld = World.deserialize(saveData.world);

            // Replace current world
            this.world = newWorld;

            // Re-establish player reference
            this.player = this.world.getEntitiesWithComponent('player')[0];

            // Update viewport to center on player
            this.updateViewport(false);

            console.log('Game loaded');
        } catch (error) {
            console.error('Error loading game:', error);
        }
    }

    // Add the speed renderer setup method
    private setupSpeedRenderer(): void {
        if (!this.display || !this.world || !this.player) {
            throw new Error('Required game objects not initialized');
        }

        this.uiSpeedRenderer = new UISpeedRenderer(this.player);

        // Listen for component modifications to update speed display
        this.world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
            this.uiSpeedRenderer.handleComponentModified(data.entity, data.componentType);
        });

        // Add frame callback to update speed renderer
        this.display.addFrameCallback((display, timestamp) => {
            this.uiSpeedRenderer.update(timestamp);
        });
    }

    private setupMinimap(gameWorld: World): void {

        // Get layout from city generator
        const layout = this.generator.getLayout();

        const blockWidth = Math.floor(gameWorld.getWorldWidth() / 12);
        const blockHeight = Math.floor(gameWorld.getWorldHeight() / 12);

        // Create minimap display
        this.minimapDisplay = new Display({
            elementId: 'minimap',  // Reference the canvas ID
            worldWidth: blockWidth,
            worldHeight: blockHeight,
            cellWidth: 10,
            cellHeight: 10,
            viewportWidth: blockWidth,
            viewportHeight: blockHeight
        });

        // Create minimap renderer
        this.minimapRenderer = new MinimapRenderer(this.minimapDisplay, this.world!);
        this.minimapRenderer.renderLayout(this.generator.getLayout()!);

        if (layout) {
            this.minimapRenderer.renderLayout(layout);

            // Set up event listener for entity movements to update minimap
            // this.world?.on('entityMoved', ({ entity, from, to }) => {
            //     const blockWidth = 12; // Match your CityBlockGenerator blockWidth
            //     const blockHeight = 12; // Match your CityBlockGenerator blockHeight

            //     // Update player marker
            //     if (entity.hasComponent('player')) {
            //         const blockX = Math.floor(to.x / blockWidth);
            //         const blockY = Math.floor(to.y / blockHeight);
            //         this.minimapRenderer.setPlayerBlock(blockX, blockY);
            //     }

            //     // Update helicopter marker
            //     if (entity.hasComponent('enemyAI') && 
            //         (entity.getComponent('enemyAI') as any).aiType === 'HELICOPTER') {
            //         const blockX = Math.floor(to.x / blockWidth);
            //         const blockY = Math.floor(to.y / blockHeight);
            //         this.minimapRenderer.setHelicopterBlock(blockX, blockY);
            //     }

            //     // Re-render the minimap
            //     this.minimapRenderer.renderLayout(layout);
            // });
        }
    }

    private postProcessVehicles(world: World) {
        const vehicleLeaders = world.getEntitiesWithComponent('vehicle-leader');
        let vehicleId: number = 0;
        vehicleLeaders.forEach(vehicleLeader => {
            vehicleId++;
            const leader = vehicleLeader.getComponent('vehicle-leader') as VehicleLeaderComponent;
            leader.vehicleId = vehicleId;


            // now we need to find all followers and set their vehicleId
            const facing = vehicleLeader.getComponent('facing') as FacingComponent;
            const direction = facing.direction;

            // loop "backwards" from direction until we hit a space with no FOLLOWER
            // set the follower's vehicleId to the current vehicleId
            for (let i = 1; i <= 3; i++) {
                let targetPosition = vehicleLeader.getPosition();
                for (let step = 0; step < i; step++) {
                    targetPosition = getTargetPosition(targetPosition, getOppositeDirection(direction));
                }

                const entities = world.getEntitiesAt(targetPosition);
                const follower = entities.find(entity => entity.hasComponent('follower'));
                if (follower) {
                    const followerComponent = follower.getComponent('follower') as FollowerComponent;
                    followerComponent.vehicleId = vehicleId;
                    follower.setComponent(followerComponent);

                    logger.warn(`set follower ${follower.getId()} to vehicle ${vehicleId}`);
                } else {
                    break;
                }
            }

        });

    }

    private selectObjective(world: World) {
        const eligibleObjectiveEntities = world.getEntitiesWithComponent('objective').filter(entity => (entity.getComponent('objective') as ObjectiveComponent)?.eligible === true);
        const randomObjective = eligibleObjectiveEntities[Math.floor(Math.random() * eligibleObjectiveEntities.length)];

        // now, get the vehicle id out of the leader component
        const leader = randomObjective.getComponent('vehicle-leader') as VehicleLeaderComponent;
        if (!leader) {
            logger.warn('no leader found for objective');
            return;
        }

        const vehicleId = leader.vehicleId;

        logger.warn(`setting objective on vehicle ${vehicleId}`);

        // now we need to get all the followers and set their vehicleId to the same as the leader
        const followers = world.getEntitiesWithComponent('follower');
        followers.forEach(follower => {
            const followerComponent = follower.getComponent('follower') as FollowerComponent;

            if (followerComponent.vehicleId === vehicleId) {
                follower.setComponent(new ObjectiveComponent(true, false));


                const light = new LightEmitterComponent({
                    "radius": 3,
                    "color": "#55CE4A",
                    "intensity": 0.6,
                    "distanceFalloff": "linear"
                });

                follower.setComponent(light);
                follower.setComponent(light);
            }
        });

        randomObjective.setComponent(new ObjectiveComponent(true, true));

        const light = new LightEmitterComponent({
            "radius": 3,
            "color": "#55CE4A",
            "intensity": 0.6,
            "distanceFalloff": "linear"
        });


        randomObjective.setComponent(light);
        randomObjective.setComponent(light);


        // const symbol = randomObjective.getComponent('symbol') as SymbolComponent;
        // symbol.foreground = '#55CE4A';
        // randomObjective.setComponent(symbol);
    }

}