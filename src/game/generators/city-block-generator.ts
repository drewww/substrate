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
import { EnergyComponent } from '../components/energy.component';
import { WorldGenerator } from '../../world/world-generator';
import startBuildingUrl from '../../assets/blocks/start.json?url';

// Import all block files with ?url suffix
const blockFiles = import.meta.glob<string>('../../assets/blocks/*.json', { query: 'url', import: 'default' });

export class CityBlockGenerator implements WorldGenerator {
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
        const world = new World(
            this.width * this.blockWidth,
            this.height * this.blockHeight
        );

        // Create and use the staged layout generator
        const layoutGenerator = new StagedLayoutGenerator(this.width, this.height);
        this.layout = layoutGenerator.generate();

        // First pass: collect all building locations
        const buildingLocations: { x: number, y: number }[] = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (cell?.type === 'building') {
                    buildingLocations.push({ x, y });
                }
            }
        }

        // Pick one random building to be the start location
        const startLocation = buildingLocations[Math.floor(Math.random() * buildingLocations.length)];

        // Now process all cells
        let blockId = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (!cell) continue;

                try {
                    let blockUrl: string | undefined;

                    if (cell.type === 'building') {
                        // Use start.json for the chosen start location
                        if (x === startLocation.x && y === startLocation.y) {
                            blockUrl = startBuildingUrl;
                        } else {
                            blockUrl = await blockFiles['../../assets/blocks/1-1b.json']();
                        }
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
                    const blockWorld = await blockGenerator.generate();

                    // Process block entities
                    blockWorld.getEntities().forEach((entity: Entity) => {
                        const newEntity = entity.clone();
                        if (cell.type === 'road' && cell.roadInfo?.orientation) {
                            this.rotateEntityPosition(newEntity, cell.roadInfo.orientation, this.blockWidth, this.blockHeight);
                        }
                        
                        const pos = newEntity.getPosition();
                        newEntity.setPosition(
                            pos.x + (x * this.blockWidth), 
                            pos.y + (y * this.blockHeight)
                        );
                        
                        // Set blockId if component supports it
                        for (const componentType of newEntity.getComponentTypes()) {
                            const component = newEntity.getComponent(componentType);
                            if (component && 'blockId' in component) {
                                (component as any).blockId = blockId;
                                newEntity.setComponent(component);
                            }
                        }
                        
                        world.addEntity(newEntity);
                    });

                    blockId++;
                } catch (error) {
                    logger.error(`Failed to load block at ${x},${y}:`, error);
                }
            }
        }

        // Remove all vehicles and pedestrians
        const entitiesToRemove = world.getEntities().filter(entity => {
            // Check for vehicles (entities with follower/followable components)
            if (entity.hasComponent('follower') || entity.hasComponent('followable') &&
                !entity.hasComponent('objective')) {
                return true;
            }

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

        this.placeHelicopter(20, 20, world);
        
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

        helicopter.setComponent(symbol);
        helicopter.setComponent(new VisionComponent(10, true));
        helicopter.setComponent(new EnemyAIComponent(EnemyAIType.HELICOPTER));
        helicopter.setComponent(new MoveComponent(true, true)); // true lets it move through walls, true lets it move diagonally
        helicopter.setComponent(new AOEDamageComponent(3, 0.5));

        helicopter.setComponent(new CooldownComponent({
            "move": {
                "base": 3,
                "current": 3,
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
        turret.setComponent(new CooldownComponent({
            "fire": {
                "base": 20,
                "current": 20,
                "ready": false
            }
        }));

        world.addEntity(turret);
    }

    private placeHomingBot(x: number, y: number, world: World) {
        const homingBot = new Entity({x, y});

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
        
        camera.setComponent(symbol);
        camera.setComponent(new VisionComponent(10, false));
        camera.setComponent(new EnemyAIComponent(EnemyAIType.CAMERA));

        world.addEntity(camera);
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