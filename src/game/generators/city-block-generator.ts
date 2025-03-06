import { World } from '../../world/world';
import { StagedLayoutGenerator } from './staged-layout-generator';
import { JsonWorldGenerator } from '../../world/generators/json-world-generator';
import { logger } from '../../util/logger';
import { Entity } from '../../entity/entity';
import { PlayerComponent } from '../../entity/components/player-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { Direction } from '../../types';
import { FacingComponent } from '../../entity/components/facing-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { VisionComponent } from '../../entity/components/vision-component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { InertiaComponent } from '../components/inertia.component';
import { CooldownComponent } from '../components/cooldown.component';
import { TestLayoutGenerator } from './test-layout-generator';
import { EnemyAIComponent } from '../components/enemy-ai.component';
import { EnemyAIType } from '../components/enemy-ai.component';
import { MoveComponent } from '../components/move.component';
import { LightEmitterComponent } from '../../entity/components/light-emitter-component';
import { HealthComponent } from '../../entity/components/health.component';
import { AOEDamageComponent } from '../components/aoe-damage.component';
import { ChunkMetadata } from '../generators/layout-generator';
import { ObjectiveComponent } from '../components/objective.component';

// Import all block files with ?url suffix
const blockFiles = import.meta.glob<string>('../../assets/blocks/*.json', { query: 'url', import: 'default' });

export class CityBlockGenerator {
    private readonly width: number = 10;
    private readonly height: number = 10;

    private readonly blockWidth: number = 12;
    private readonly blockHeight: number = 12;

    private layout: ChunkMetadata[][] | null = null;

    private rotateEntityPosition(entity: Entity, orientation: number, blockWidth: number, blockHeight: number): void {
        const pos = entity.getPosition();
        let newX = pos.x;
        let newY = pos.y;

        switch (orientation) {
            case 1: // E/W
                newX = blockWidth - 1 - pos.y;
                newY = pos.x;
                break;
            case 2: // S/N
                newX = blockWidth - 1 - pos.x;
                newY = blockHeight - 1 - pos.y;
                break;
            case 3: // W/E
                newX = pos.y;
                newY = blockHeight - 1 - pos.x;
                break;
        }

        entity.setPosition(newX, newY);

        // Rotate facing component if it exists
        const facing = entity.getComponent("facing") as FacingComponent;
        if (facing) {
            const currentFacing = facing.direction;
            let newFacing = currentFacing;
            
            switch (orientation) {
                case 1: // E/W
                    newFacing = (currentFacing + 1) % 4;
                    break;
                case 2: // S/N
                    newFacing = (currentFacing + 2) % 4;
                    break;
                case 3: // W/E
                    newFacing = (currentFacing + 3) % 4;
                    break;
            }
            
            entity.setComponent(new FacingComponent(newFacing));
        }
    }

    async generate(): Promise<World> {
        // Create a new world with dimensions based on layout and block size
        const world = new World(
            this.width * this.blockWidth,
            this.height * this.blockHeight
        );

        // Create and use the staged layout generator
        const layoutGenerator = new StagedLayoutGenerator(this.width, this.height);
        this.layout = layoutGenerator.generate();  // Store the layout

        // Process each cell in the layout
        let blockId = 0;  // Add block ID counter
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (!cell) continue;

                try {
                    // Get the block file URL based on road shape metadata
                    let blockUrl: string | undefined;

                    if(cell.type === 'building') {
                        blockUrl = await blockFiles['../../assets/blocks/1-1b.json']();
                    } else if (cell.roadInfo?.type === 'intersection') {
                        // Use different blocks for 3-way vs 4-way intersections
                        const isThreeWay = cell.roadInfo.connections.length === 3;
                        if (cell.roadInfo.weight === 'trunk' && !isThreeWay) {
                            blockUrl = await blockFiles['../../assets/blocks/4-6i.json']();
                        } else if (cell.roadInfo.weight === 'minor') {
                            blockUrl = await blockFiles[isThreeWay ? 
                                '../../assets/blocks/3-2i.json' : 
                                '../../assets/blocks/4-2i.json']();
                        } else if (cell.roadInfo.weight === 'medium') {
                            blockUrl = await blockFiles[isThreeWay ? 
                                '../../assets/blocks/3-4i.json' : 
                                '../../assets/blocks/4-4i.json']();
                        } else {
                            blockUrl = await blockFiles[isThreeWay ? 
                                '../../assets/blocks/3-6i.json' : 
                                '../../assets/blocks/4-6i.json']();
                        }
                    } else if (cell.roadInfo?.type === 'straight') {
                        if (cell.roadInfo.weight === 'trunk') {
                            blockUrl = await blockFiles['../../assets/blocks/6-s.json']();
                        } else if (cell.roadInfo.weight === 'minor') {
                            blockUrl = await blockFiles['../../assets/blocks/2-s.json']();
                        } else {
                            blockUrl = await blockFiles['../../assets/blocks/4-s.json']();
                        }
                    } else if (cell.roadInfo?.type === 'turn') {
                        if (cell.roadInfo.weight === 'trunk') {
                            blockUrl = await blockFiles['../../assets/blocks/6-t.json']();
                        } else if (cell.roadInfo.weight === 'minor') {
                            blockUrl = await blockFiles['../../assets/blocks/2-t.json']();
                        } else {
                            blockUrl = await blockFiles['../../assets/blocks/4-t.json']();
                        }
                    } else if (cell.roadInfo?.type === 'deadend') {
                        if (cell.roadInfo.weight === 'minor') {
                            blockUrl = await blockFiles['../../assets/blocks/2-d.json']();
                        } else if (cell.roadInfo.weight === 'trunk') {
                            blockUrl = await blockFiles['../../assets/blocks/6-d.json']();
                        } else {
                            blockUrl = await blockFiles['../../assets/blocks/4-d.json']();
                        }
                    } else if (cell.roadInfo?.type === 'unknown') {
                        blockUrl = await blockFiles['../../assets/blocks/unknown.json']();
                    } else {
                        logger.error(`Unknown road type at ${x},${y}: ${cell}`);
                        blockUrl = await blockFiles['../../assets/blocks/unknown.json']();

                        continue;
                    }
                    
                    if (!blockUrl) {
                        logger.error(`No block file found for type ${cell.roadInfo?.type}`);
                        continue;
                    }

                    const blockGenerator = await JsonWorldGenerator.fromUrl(blockUrl);
                    const blockWorld = blockGenerator.generate();

                    // Copy and rotate entities from block to city world
                    const offsetX = x * this.blockWidth;
                    const offsetY = y * this.blockHeight;

                    blockWorld.getEntities().forEach(entity => {
                        const newEntity = entity.clone();
                        
                        // Apply rotation if this is a road
                        if (cell.type === 'road' && cell.roadInfo?.orientation) {
                            this.rotateEntityPosition(newEntity, cell.roadInfo.orientation, this.blockWidth, this.blockHeight);
                        }
                        
                        // Apply block offset
                        const pos = newEntity.getPosition();
                        newEntity.setPosition(pos.x + offsetX, pos.y + offsetY);
                        
                        // Check all components for blockId field and set it
                        for (const componentType of newEntity.getComponentTypes()) {
                            const component = newEntity.getComponent(componentType);
                            if (component && 'blockId' in component) {
                                (component as any).blockId = blockId;
                                newEntity.setComponent(component);

                                logger.info(`Setting blockId ${blockId} for entity ${newEntity.getId()}`);
                            }
                        }
                        
                        world.addEntity(newEntity);
                    });

                    blockId++; // Increment block ID after processing each block
                } catch (error) {
                    logger.error(`Failed to load block at ${x},${y}:`, error);
                }
            }
        }


        // look for a space that is not impassable to place the player
        // let playerX = 0;
        // let playerY = 0;
        // for (let y = 0; y < this.height; y++) {
        //     for (let x = 0; x < this.width; x++) {
        //         if (playerX === 0 && playerY === 0 && !world.getEntitiesAt({x, y}).some(entity => entity.hasComponent("impassable"))) {
        //             playerX = x;
        //             playerY = y;
        //             break;
        //         }
        //     }
        // }

        // Remove all vehicles and pedestrians
        const entitiesToRemove = world.getEntities().filter(entity => {
            // Check for vehicles (entities with follower/followable components)
            // if (entity.hasComponent('follower') || entity.hasComponent('followable') &&
            //     !entity.hasComponent('objective') && ) {
            //     return true;
            // }

            // Check for pedestrians
            const aiComponent = entity.getComponent('enemyAI') as EnemyAIComponent;
            if (aiComponent && aiComponent.aiType === EnemyAIType.PEDESTRIAN) {
                return true;
            }

            return false;
        });

        entitiesToRemove.forEach(entity => {
            world.removeEntity(entity.getId());
        });


        this.placePlayer(12, 12, world);


        // later make sure it's not too close to the player
        // this.placeHelicopter(Math.floor(world.getWorldWidth()*Math.random()),
        //                      Math.floor(world.getWorldHeight()*Math.random()), world);
        // this.placeHelicopter(20, 20, world);
        

        // this.placeCamera(11, 11, world);

        // let's randomly add cameras to the world.
        // the rule for deciding where to put them is -- on top of a wall tile ('#') AND with at least 5 adjacent
        // non opaque tiles.

        // Get all wall tiles (entities with both impassable and symbol components where symbol is '#')
        const wallTiles = world.getEntities()
            .filter(entity => {
                if (!entity.hasComponent("impassable") || !entity.hasComponent("symbol")) return false;
                const symbol = entity.getComponent("symbol") as SymbolComponent;
                return symbol.char === '#';
            });

        // Shuffle array
        const shuffledWalls = [...wallTiles].sort(() => Math.random() - 0.5);

        // Place up to 25 cameras
        let camerasPlaced = 0;
        for (const wall of shuffledWalls) {
            if (camerasPlaced >= 40) break;

            const pos = wall.getPosition();
            
            // Count non-opaque adjacent tiles
            let visibleTiles = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    
                    const entities = world.getEntitiesAt({x: pos.x + dx, y: pos.y + dy});
                    if (!entities.some(e => e.hasComponent("opacity"))) {
                        visibleTiles++;
                    }
                }
            }

            if (visibleTiles >= 5) {
                this.placeCamera(pos.x, pos.y, world);
                camerasPlaced++;
            }
        }

        // this.placeTurret(11, 11, world);
        
        // this.placeHomingBot(16, 16, world);

        return world;
    }
    
    private placeHelicopter(x: number, y: number, world: World) {
        const helicopter = new Entity({x, y});


        const symbol = new SymbolComponent();
        symbol.char = '🜛';
        symbol.foreground = '#FFFFFFFF';
        symbol.background = '#FF194D00';
        symbol.zIndex = 500;
        symbol.scaleSymbolX = 1.4;
        symbol.scaleSymbolY = 1.4;
        symbol.offsetSymbolY = -0.1;
        symbol.fontWeight = 'bold';
        symbol.alwaysRenderIfExplored = false;


        // symbol.animations = {
        //     rotation: {
        //         duration: 1,
        //         loop: true,
        //         start: 0,
        //         end: 360
        //     }
        // };  

        helicopter.setComponent(symbol);
        helicopter.setComponent(new VisionComponent(10, true));
        helicopter.setComponent(new EnemyAIComponent(EnemyAIType.HELICOPTER));
        helicopter.setComponent(new MoveComponent(true, true)); // true lets it move through walls, true lets it move diagonally
        helicopter.setComponent(new AOEDamageComponent(3, 0.5));

        helicopter.setComponent(new CooldownComponent({
            "move": {
                "base": 2,
                "current": 2,
                "ready": false
            }
        }));
        
        helicopter.setComponent(new LightEmitterComponent({
            "radius": 3,
            "color": "#FF194DFF",
            "intensity": 0.6,
            "distanceFalloff": "step-soft",
        }));

        world.addEntity(helicopter);
    }

    private placeTurret(x: number, y: number, world: World) {
        const turret = new Entity({x, y});
        
        const symbol = new SymbolComponent();
        symbol.char = '⛣';
        symbol.foreground = '#FF194DFF';
        symbol.background = '#00000000';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;
        symbol.scaleSymbolX = 1.5;
        symbol.scaleSymbolY = 1.5;
        symbol.fontWeight = 'bold';

        turret.setComponent(symbol);
        turret.setComponent(new VisionComponent(10, false));
        turret.setComponent(new EnemyAIComponent(EnemyAIType.EMP_TURRET));

        world.addEntity(turret);
    }


    //
    private placeHomingBot(x: number, y: number, world: World) {
        const homingBot = new Entity({x, y});

        // CONCEPT
        // bot activates when it sees you, moves FAST at you (turbo speed?? or "normal" speed?)
        // when it gets to you...
        //    ... pops some decaying obstacles?
        //    ... if it's within N tiles, shoots you? 
        const symbol = new SymbolComponent();
        symbol.char = '🜻';
        symbol.foreground = '#FF194DFF';
        symbol.background = '#00000000';
        symbol.scaleSymbolX = 1.5;  
        symbol.scaleSymbolY = 1.5;
        symbol.fontWeight = 'bold';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;

        homingBot.setComponent(symbol);
        homingBot.setComponent(new VisionComponent(10, false));
        homingBot.setComponent(new EnemyAIComponent(EnemyAIType.FOLLOWER));
        homingBot.setComponent(new MoveComponent(false, true)); // true lets it move through walls, true lets it move diagonally
        homingBot.setComponent(new CooldownComponent({
            "move": {
                "base": 2,
                "current": 2,
                "ready": false
            }
        }));

        world.addEntity(homingBot);
    }

    private placeCamera(x: number, y: number, world: World) {
        const camera = new Entity({x, y});

        const symbol = new SymbolComponent();
        symbol.char = '⏚';
        symbol.foreground = '#FF194DFF';
        symbol.background = '#FFFFFFFF';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;
        // symbol.lockRotationToFacing = true;
        

        camera.setComponent(symbol);
        camera.setComponent(new VisionComponent(10, false));
        camera.setComponent(new EnemyAIComponent(EnemyAIType.CAMERA));

        world.addEntity(camera);
    }

    private placePlayer(x: number, y:number, world: World) {

        const player = new Entity({x, y});

        const symbol = new SymbolComponent();
        symbol.char = '⧋';
        symbol.foreground = '#FF194DFF';
        symbol.background = '#7EECF400';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;
        symbol.lockRotationToFacing = true;
        symbol.scaleSymbolX = 1.5;
        symbol.scaleSymbolY = 1.5;
        symbol.offsetSymbolY = -0.05;
        symbol.fontWeight = 'bold';
        player.setComponent(symbol);

        player.setComponent(new FacingComponent(Direction.None));
        player.setComponent(new ImpassableComponent());
        player.setComponent(new PlayerComponent());

        player.setComponent(new HealthComponent(12, 12));

        // TRUE here sets "ignore walls" vision
        player.setComponent(new VisionComponent(20, true));

        world.addEntity(player);
    }

    private placeRoad(x: number, y: number, world: World) {
        const road = new Entity({x, y});
        road.setComponent(new SymbolComponent(
            '.',
            '#333333',
            '#000000'
        ));
        world.addEntity(road);
    }

    public getLayout(): ChunkMetadata[][] | null {
        return this.layout;
    }
} 