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
    constructor(private readonly jsonData: LevelData) {}

    generate(): World {
        const startTime = performance.now();
        const data = this.jsonData;

        // Validate version
        if (data.version !== '1.0') {
            logger.warn(`Unknown level format version: ${data.version}`);
        }

        // Create world with specified dimensions
        const world = new World(data.width, data.height);
        world.unready();

        // Track component statistics
        const componentStats: { [key: string]: number } = {};

        // Create entities
        for (const entityData of data.entities) {
            try {
                const entity = Entity.deserialize(entityData);
                
                // Count components
                entity.getComponents().forEach(component => {
                    componentStats[component.type] = (componentStats[component.type] || 0) + 1;
                });
                
                world.addEntity(entity);
            } catch (e) {
                logger.error(`Failed to deserialize entity:`, entityData, e);
            }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Log detailed statistics
        logger.info('World generation complete:', {
            dimensions: `${world.getWorldWidth()}x${world.getWorldHeight()}`,
            entityCount: world.getEntities().length,
            duration: `${duration.toFixed(2)}ms`,
            componentsCreated: componentStats,
            averageComponentsPerEntity: Object.values(componentStats).reduce((a, b) => a + b, 0) / world.getEntities().length
        });

        world.ready();
        return world;
    }

    // Static helper to load from file
    static async fromFile(path: string): Promise<JsonWorldGenerator> {
        // Handle both development and production paths
        const basePath = import.meta.env.DEV 
            ? '' // In dev, paths are served from root
            : import.meta.env.BASE_URL || '/'; // In prod, respect the base URL

        const fullPath = `${basePath}${path}`;
        
        try {
            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`Failed to load level file: ${response.statusText}`);
            }
            const jsonData = await response.text();
            return new JsonWorldGenerator(JSON.parse(jsonData));
        } catch (error) {
            logger.error(`Failed to load world file from ${fullPath}:`, error);
            throw error;
        }
    }
} 