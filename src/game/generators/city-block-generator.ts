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

// Import all block files with ?url suffix
const blockFiles = import.meta.glob<string>('../../assets/blocks/*.json', { query: 'url', import: 'default' });

export class CityBlockGenerator {
    private readonly width: number = 10;
    private readonly height: number = 10;

    private readonly blockWidth: number = 12;
    private readonly blockHeight: number = 12;

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
        const layout = layoutGenerator.generate();

        // Process each cell in the layout
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = layout[y][x];
                if (!cell) continue;

                try {
                    // Get the block file URL based on road shape metadata
                    let blockUrl: string | undefined;

                    if(cell.type === 'building') {
                        blockUrl = await blockFiles['../../assets/blocks/1-1b.json']();
                    } else if (cell.roadInfo?.type === 'intersection') {
                        blockUrl = await blockFiles['../../assets/blocks/4-4i.json']();
                    } else if (cell.roadInfo?.type === 'straight' || cell.roadInfo?.type === 'deadend') {
                        blockUrl = await blockFiles['../../assets/blocks/4-s.json']();
                    } else if (cell.roadInfo?.type === 'turn') {
                        blockUrl = await blockFiles['../../assets/blocks/4-t.json']();
                    } else if (cell.roadInfo?.type === 'unknown') {
                        blockUrl = await blockFiles['../../assets/blocks/unknown.json']();
                    } else {
                        logger.error(`Unknown road type at ${x},${y}: ${cell.roadInfo?.type}`);
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
                        
                        world.addEntity(newEntity);
                    });

                    // logger.info(`Loaded block at ${x},${y} with ${blockWorld.getEntities().length} entities`);
                } catch (error) {
                    logger.error(`Failed to load block at ${x},${y}:`, error);
                }
            }
        }


        // look for a space that is not impassable to place the player
        let playerX = 0;
        let playerY = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (playerX === 0 && playerY === 0 && !world.getEntitiesAt({x, y}).some(entity => entity.hasComponent("impassable"))) {
                    playerX = x;
                    playerY = y;
                    break;
                }
            }
        }

        this.placePlayer(playerX, playerY, world);

        return world;
    }

    private placePlayer(x: number, y:number, world: World) {

        const player = new Entity({x, y});

        const symbol = new SymbolComponent();
        symbol.char = '⧋';
        symbol.foreground = '#FFFFFFFF';
        symbol.background = '#00D3EFFF';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;
        symbol.lockRotationToFacing = true;
        symbol.scaleSymbolX = 1.5;
        symbol.scaleSymbolY = 1.5;
        symbol.offsetSymbolY = -0.05;
        symbol.fontWeight = 'bold';
        player.setComponent(symbol);

        player.setComponent(new FacingComponent(Direction.None));
        player.setComponent(new OpacityComponent());
        player.setComponent(new ImpassableComponent());
        player.setComponent(new PlayerComponent());
        player.setComponent(new VisionComponent(20));

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
} 