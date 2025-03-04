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
const blockFiles = import.meta.glob('../../assets/blocks/*.json', { as: 'url' });

export class CityBlockGenerator {
    private readonly width: number = 10;
    private readonly height: number = 10;

    private readonly blockWidth: number = 12;
    private readonly blockHeight: number = 12;

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
                    // Get the block file URL from the imported files
                    // always use 4-4i for now. we will diversify later.
                    // choose between 4-4i and 4-6i randomly. those are our two options now.
                    let blockUrl;
                    if(Math.random() > 0.5) {
                        blockUrl = await blockFiles['../../assets/blocks/4-4i.json']();
                    } else {
                        blockUrl = await blockFiles['../../assets/blocks/4-6i.json']();
                    }
                    
                    if (!blockUrl) {
                        logger.error(`No block file found at 4-4i.json`);
                        continue;
                    }

                    const blockGenerator = await JsonWorldGenerator.fromUrl(blockUrl);
                    const blockWorld = blockGenerator.generate();

                    // Copy entities from block to city world with offset
                    const offsetX = x * this.blockWidth;
                    const offsetY = y * this.blockHeight;

                    blockWorld.getEntities().forEach(entity => {
                        const pos = entity.getPosition();
                        const newEntity = entity.clone();
                        newEntity.setPosition(pos.x + offsetX, pos.y + offsetY);
                        world.addEntity(newEntity);
                    });

                    // just fill in the entire block with

                    // just iterate from 0,0 in block coordinates to 11,11
                    // for (let i = 0; i < this.blockWidth; i++) {
                    //     for (let j = 0; j < this.blockHeight; j++) {
                    //         this.placeRoad(i+x*this.blockWidth, j+y*this.blockHeight, world);
                    //     }
                    // }

                    // logger.info(`Loaded block at ${x},${y} with ${blockWorld.getEntities().length} entities`);
                } catch (error) {
                    logger.error(`Failed to load block at ${x},${y}:`, error);
                }
            }
        }

        this.placePlayer(10, 10, world);

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

        // player.setComponent(new InertiaComponent(Direction.North, 0));
        // player.setComponent(new CooldownComponent({
        //     move: {
        //         base: 4,
        //         current: 4,
        //         ready: false
        //     }
        // }));

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