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
import endBuildingUrl from '../../assets/blocks/end.json?url';
import { SpawnHintComponent } from '../components/spawn-hint.component';
import { SimpleLayoutGenerator } from './simple-layout-generator';

// Import all block files with ?url suffix
const blockFiles = import.meta.glob<string>('../../assets/blocks/*.json', { query: 'url', import: 'default' });

// Types for block configuration
type BlockVariant = {
    url: string;  // Path to JSON file
    weight: number;  // 0-1 probability weight
};

type BlockConfig = {
    variants: BlockVariant[];
    // Could add other block-specific config here in the future
    // like rotation rules, special placement rules, etc.
};

// Enum or type for all possible block types
type BlockType = 
    // Buildings
    | "1x1-building"
    | "start-building"
    | "end-building"
    
    // Intersections
    | "4-way-minor"      // 2-width roads
    | "4-way-medium"     // 4-width roads
    | "4-way-trunk"      // 6-width roads
    | "3-way-minor"
    | "3-way-medium"
    | "3-way-trunk"
    
    // Straight roads
    | "straight-minor"
    | "straight-medium"
    | "straight-trunk"
    
    // Turns
    | "turn-minor"
    | "turn-medium"
    | "turn-trunk"
    
    // Dead ends
    | "deadend-minor"
    | "deadend-medium"
    | "deadend-trunk";

// The actual lookup table
const BLOCK_CONFIGS: Record<BlockType, BlockConfig> = {
    // Buildings
    "1x1-building": {
        variants: [
            { url: "1-1b.json", weight: 0.4 },
            { url: "1-1b-a.json", weight: 0.2 },
            { url: "1-1b-restaurant.json", weight: 0.1 },
            { url: "1-1b-security.json", weight: 0.1 },
            { url: "1-1b-shipping.json", weight: 0.1 },
            { url: "1-1b-park.json", weight: 0.1 },
        ]
    },
    "start-building": {
        variants: [
            { url: "start.json", weight: 1.0 }
        ]
    },
    "end-building": {
        variants: [
            { url: "end.json", weight: 1.0 }
        ]
    },

    // Intersections - 4 way
    "4-way-minor": {
        variants: [
            { url: "4-2i.json", weight: 1.0 },
        ]
    },
    "4-way-medium": {
        variants: [
            { url: "4-4i.json", weight: 1.0 }
        ]
    },
    "4-way-trunk": {
        variants: [
            { url: "4-6i.json", weight: 1.0 }
        ]
    },

    // Intersections - 3 way
    "3-way-minor": {
        variants: [
            { url: "3-2i.json", weight: 1.0 }
        ]
    },
    "3-way-medium": {
        variants: [
            { url: "3-4i.json", weight: 1.0 }
        ]
    },
    "3-way-trunk": {
        variants: [
            { url: "3-6i.json", weight: 1.0 }
        ]
    },

    // Straight roads
    "straight-minor": {
        variants: [
            { url: "2-s.json", weight: 0.2 },
            { url: "2-s-drivethrough.json", weight: 0.8 }
        ]
    },
    "straight-medium": {
        variants: [
            { url: "4-s.json", weight: 1.0 }
        ]
    },
    "straight-trunk": {
        variants: [
            { url: "6-s.json", weight: 1.0 },
        ]
    },

    // Turns
    "turn-minor": {
        variants: [
            { url: "2-t.json", weight: 1.0 }
        ]
    },
    "turn-medium": {
        variants: [
            { url: "4-t.json", weight: 1.0 }
        ]
    },
    "turn-trunk": {
        variants: [
            { url: "6-t.json", weight: 1.0 }
        ]
    },

    // Dead ends
    "deadend-minor": {
        variants: [
            { url: "2-d.json", weight: 1.0 }
        ]
    },
    "deadend-medium": {
        variants: [
            { url: "4-d.json", weight: 1.0 }
        ]
    },
    "deadend-trunk": {
        variants: [
            { url: "6-d.json", weight: 1.0 }
        ]
    }
} as const;

// Helper function to select a variant based on weights
function selectVariant(blockType: BlockType, options?: CityBlockGeneratorOptions): string {
    // Special case for end-building when trueEnd is enabled
    if (blockType === "end-building" && options?.trueEnd) {
        logger.warn(`Using true end template because trueEnd is ${options.trueEnd}`);
        return "end-true.json";
    }
    
    const config = BLOCK_CONFIGS[blockType];
    const totalWeight = config.variants.reduce((sum, variant) => sum + variant.weight, 0);
    let random = Math.random() * totalWeight;
    logger.warn(`blockType: ${blockType} random: ${random} options.trueEnd: ${options?.trueEnd}`);

    for (const variant of config.variants) {
        random -= variant.weight;
        if (random <= 0) {
            // Check if we're selecting an end building and trueEnd is enabled      
            return variant.url;
        }
    }
    
    // Fallback to first variant if something goes wrong
    return config.variants[0].url;
}

// First, update the CityBlockGeneratorOptions type to include spawn probabilities
export type CityBlockGeneratorOptions = {
    layoutType: 'generate' | 'fixed';
    spawnProbabilities?: {
        pedestrian?: number;  // 0.0 to 1.0
        camera?: number;      // 0.0 to 1.0
        boomer?: number;      // 0.0 to 1.0
        turret?: number;      // 0.0 to 1.0
    };
    spawnHelicopter?: boolean; // Whether to spawn a helicopter
    width?: number;
    height?: number;
    objectiveCount?: number;   // Number of objectives to generate
    trueEnd?: boolean;         // Whether to use the true end template
};

export class CityBlockGenerator implements WorldGenerator {
    private readonly blockWidth: number = 12;
    private readonly blockHeight: number = 12;
    private readonly options: CityBlockGeneratorOptions;
    private layout: ChunkMetadata[][] | null = null;
    
    // Default probabilities
    private readonly defaultProbabilities = {
        pedestrian: 0.3,
        camera: 0.2,
        boomer: 0.15,
        turret: 0.1
    };
    
    // Remove the hardcoded width/height and make them computed properties
    private get width(): number {
        if (this.options.layoutType === 'fixed') {
            return 4;
        }
        return this.options.width || 10; // Default to 10 if not specified
    }
    
    private get height(): number {
        if (this.options.layoutType === 'fixed') {
            return 4;
        }
        return this.options.height || 10; // Default to 10 if not specified
    }

    constructor(options: CityBlockGeneratorOptions = { layoutType: 'generate' }) {
        // Copy the options
        this.options = { ...options };
        
        // Infer trueEnd based on map size and helicopter
        // Check if width exists and is 10+ (medium or large)
        const width = this.options.width || 0; // Default to 0 if undefined
        const isMediumOrLarge = width >= 8;
        const hasHelicopter = this.options.spawnHelicopter === true;
        
        // Set trueEnd flag
        this.options.trueEnd = isMediumOrLarge && hasHelicopter;
        // this.options.trueEnd = true;
        
        // Log the options for debugging
        logger.warn(`CityBlockGenerator options: ${JSON.stringify(this.options)}`);
    }

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
        // Add 2 to each dimension for the border walls
        const world = new World(
            (this.width * this.blockWidth) + 2,
            (this.height * this.blockHeight) + 2
        );

        // Create and use the appropriate layout generator based on options
        const layoutGenerator = this.options.layoutType === 'fixed' 
            ? new SimpleLayoutGenerator()
            : new StagedLayoutGenerator(this.width, this.height);
            
        this.layout = layoutGenerator.generate();

        // Add border walls first
        const worldWidth = (this.width * this.blockWidth) + 2;
        const worldHeight = (this.height * this.blockHeight) + 2;

        // Create walls around the border
        for (let x = 0; x < worldWidth; x++) {
            for (let y = 0; y < worldHeight; y++) {
                // Only add walls at the edges
                if (x === 0 || x === worldWidth - 1 || y === 0 || y === worldHeight - 1) {
                    const wall = new Entity({ x, y });
                    wall.setComponent(new SymbolComponent('#', '#666666', '#000000', 100));
                    wall.setComponent(new ImpassableComponent());
                    wall.setComponent(new OpacityComponent());
                    world.addEntity(wall);
                }
            }
        }

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

        // Pick random buildings for start and end locations
        const startIndex = Math.floor(Math.random() * buildingLocations.length);
        const startLocation = buildingLocations[startIndex];
        
        // Remove the start location from available buildings and pick end location
        buildingLocations.splice(startIndex, 1);
        const endLocation = buildingLocations[Math.floor(Math.random() * buildingLocations.length)];

        // Now process all cells
        let blockId = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (!cell) continue;

                try {
                    let blockUrl: string | undefined;
                    let blockType: BlockType;

                    if (cell.type === 'building') {
                        if (x === startLocation.x && y === startLocation.y) {
                            blockType = 'start-building';
                        } else if (x === endLocation.x && y === endLocation.y) {
                            blockType = 'end-building';
                        } else {
                            blockType = '1x1-building';
                        }
                    } else if (cell.roadInfo?.type === 'intersection') {
                        const isThreeWay = cell.roadInfo.connections.length === 3;
                        const prefix = isThreeWay ? '3-way-' : '4-way-';
                        
                        switch (cell.roadInfo.weight) {
                            case 'trunk':
                                blockType = `${prefix}trunk` as BlockType;
                                break;
                            case 'minor':
                                blockType = `${prefix}minor` as BlockType;
                                break;
                            default:
                                blockType = `${prefix}medium` as BlockType;
                        }
                    } else if (cell.roadInfo?.type === 'straight') {
                        switch (cell.roadInfo.weight) {
                            case 'trunk':
                                blockType = 'straight-trunk';
                                break;
                            case 'minor':
                                blockType = 'straight-minor';
                                break;
                            default:
                                blockType = 'straight-medium';
                        }
                    } else if (cell.roadInfo?.type === 'turn') {
                        switch (cell.roadInfo.weight) {
                            case 'trunk':
                                blockType = 'turn-trunk';
                                break;
                            case 'minor':
                                blockType = 'turn-minor';
                                break;
                            default:
                                blockType = 'turn-medium';
                        }
                    } else if (cell.roadInfo?.type === 'deadend') {
                        switch (cell.roadInfo.weight) {
                            case 'trunk':
                                blockType = 'deadend-trunk';
                                break;
                            case 'minor':
                                blockType = 'deadend-minor';
                                break;
                            default:
                                blockType = 'deadend-medium';
                        }
                    } else {
                        logger.error(`Unknown road type at ${x},${y}: ${cell}`);
                        throw new Error(`Unknown road type at ${x},${y}`);
                    }

                    
                    // Select a variant based on weights and get its URL path
                    const variantPath = selectVariant(blockType, this.options);
                    
                    logger.warn(`blockType: ${blockType} variantPath: ${variantPath}`);

                    // Fix: Call the import function and await its result
                    const importPath = `../../assets/blocks/${variantPath}`;
                    if (!(importPath in blockFiles)) {
                        logger.error(`No block file found for path ${importPath}`);
                        continue;
                    }

                    // Fix: Call the import function and await its result
                    blockUrl = await blockFiles[importPath]();

                    if (!blockUrl) {
                        logger.error(`No block file found for type ${blockType}`);
                        continue;
                    }

                    const blockGenerator = await JsonWorldGenerator.fromUrl(blockUrl);
                    const blockWorld = await blockGenerator.generate();

                    // Process block entities with offset
                    blockWorld.getEntities().forEach((entity: Entity) => {
                        const newEntity = entity.clone();
                        if (cell.type === 'road' && cell.roadInfo?.orientation) {
                            this.rotateEntityPosition(newEntity, cell.roadInfo.orientation, this.blockWidth, this.blockHeight);
                        }
                        
                        const pos = newEntity.getPosition();
                        newEntity.setPosition(
                            pos.x + (x * this.blockWidth) + 1, // Add 1 for border offset
                            pos.y + (y * this.blockHeight) + 1 // Add 1 for border offset
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

        // Only place helicopter if spawnHelicopter is true
        if (this.options.spawnHelicopter) {
            // Get player position
            const player = world.getPlayer();
            const playerPos = player ? player.getPosition() : null;
            
            // Try to find a position that's at least 20 blocks away from the player
            let x, y, attempts = 0;
            const MAX_ATTEMPTS = 50; // Prevent infinite loops
            
            do {
                x = Math.floor(Math.random() * (this.width-2))+1;
                y = Math.floor(Math.random() * (this.height-2))+1;
                
                // Convert to world coordinates
                const worldX = x * this.blockWidth;
                const worldY = y * this.blockHeight;
                
                // If no player or we've tried too many times, use this position
                if (!playerPos || attempts >= MAX_ATTEMPTS) {
                    break;
                }
                
                // Calculate distance to player
                const distanceToPlayer = Math.sqrt(
                    Math.pow(worldX - playerPos.x, 2) + 
                    Math.pow(worldY - playerPos.y, 2)
                );
                
                // If distance is greater than 20, we're good
                if (distanceToPlayer > 20) {
                    break;
                }
                
                attempts++;
            } while (attempts < MAX_ATTEMPTS);
            
            this.placeHelicopter(x * this.blockWidth, y * this.blockHeight, world);
        }

        // Use the spawn hinting system instead of random placements
        this.postProcessEnemies(world);

        // Get the objective count from options or use a default
        const objectiveCount = this.options.objectiveCount || 3;
        
        // Generate objectives based on the count
        // This is just a placeholder - you'll need to adapt this to your actual objective generation logic
        for (let i = 0; i < objectiveCount; i++) {
            // Generate an objective
            // ...
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
        symbol.scaleSymbolX = 1.1;
        symbol.scaleSymbolY = 1.1;
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
        symbol.zIndex = 1000;
        symbol.alwaysRenderIfExplored = false;
        symbol.scaleSymbolX = 1.5;
        symbol.scaleSymbolY = 1.5;
        symbol.fontWeight = 'bold';
        symbol.blendMode = 'normal';

        turret.setComponent(symbol);
        turret.setComponent(new VisionComponent(5, false));
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
        symbol.scaleSymbolX = 1.2;  
        symbol.scaleSymbolY = 1.2;
        symbol.fontWeight = 'bold';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;

        homingBot.setComponent(symbol);
        homingBot.setComponent(new VisionComponent(5, false));
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
        symbol.background = '#A0A0A0FF';
        symbol.zIndex = 500;
        symbol.alwaysRenderIfExplored = false;
        
        camera.setComponent(symbol);
        camera.setComponent(new VisionComponent(8, false));
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

    private postProcessEnemies(world: World) {
        // Get all entities with spawn hints
        const spawnHints = world.getEntitiesWithComponent(SpawnHintComponent.type);

        for (const hintEntity of spawnHints) {
            const pos = hintEntity.getPosition();
            const hint = (hintEntity.getComponent(SpawnHintComponent.type) as SpawnHintComponent).hint;
            const roll = Math.random();
            const threshold = 1 - this.getProbability(hint as 'pedestrian' | 'camera' | 'boomer' | 'turret');

            // Remove the hint entity
            world.removeEntity(hintEntity.getId());

            // Use the configured probability for this enemy type
            if (roll > threshold) {
                switch (hint) {
                    case 'camera':
                        this.placeCamera(pos.x, pos.y, world);
                        break;
                    case 'turret':
                        this.placeTurret(pos.x, pos.y, world);
                        break;
                    case 'boomer':
                        this.placeHomingBot(pos.x, pos.y, world);
                        break;
                    case 'pedestrian':
                        this.placePedestrian(pos.x, pos.y, world);
                        break;
                }
            }
        }
    }

    private placePedestrian(x: number, y: number, world: World) {
        const pedestrian = new Entity({x, y});

        pedestrian.setComponent(new SymbolComponent('⚉', '#aaaaaaff', '#00000000', 200, false));
        // pedestrian.setComponent(new VisionComponent(5, false));
        pedestrian.setComponent(new EnemyAIComponent(EnemyAIType.PEDESTRIAN));
        pedestrian.setComponent(new ImpassableComponent());
        pedestrian.setComponent(new CooldownComponent({
            "move": {
                "base": 8,
                "current": 8,
                "ready": false
            }
        }));

        world.addEntity(pedestrian);
    }

    // Helper method to get the probability with fallback to defaults
    private getProbability(enemyType: 'pedestrian' | 'camera' | 'boomer' | 'turret'): number {
        return this.options.spawnProbabilities?.[enemyType] ?? this.defaultProbabilities[enemyType];
    }
} 