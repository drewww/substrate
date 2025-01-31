import { World } from "../world";
import { WorldGenerator } from "../world-generator";
import { Entity } from "../../entity/entity";
import { logger } from "../../util/logger";

interface LevelData {
    version: string;
    width: number;
    height: number;
    entities: {
        id?: string;
        position: { x: number, y: number };
        components: any[];
    }[];
}

export class JsonWorldGenerator implements WorldGenerator {
    constructor(private readonly jsonData: string) {}

    generate(): World {
        const startTime = performance.now();
        
        // Parse the JSON data
        let levelData: LevelData;
        try {
            levelData = JSON.parse(this.jsonData);
        } catch (e) {
            throw new Error(`Failed to parse level JSON: ${e}`);
        }

        // Validate version
        if (levelData.version !== '1.0') {
            logger.warn(`Unknown level format version: ${levelData.version}`);
        }

        // Create world with specified dimensions
        const world = new World(levelData.width, levelData.height);
        world.unready();

        // Create entities
        for (const entityData of levelData.entities) {
            try {
                const entity = Entity.deserialize(entityData);
                world.addEntity(entity);
            } catch (e) {
                logger.error(`Failed to deserialize entity:`, entityData, e);
            }
        }

        const endTime = performance.now();
        logger.info(`JSON world generation took ${endTime - startTime}ms to place ${world.getEntities().length} entities`);

        world.ready();
        return world;
    }

    // Static helper to load from file
    static async fromFile(path: string): Promise<JsonWorldGenerator> {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load level file: ${response.statusText}`);
        }
        const jsonData = await response.text();
        return new JsonWorldGenerator(jsonData);
    }
} 