import { World } from '../../world/world';
import { StagedLayoutGenerator } from './staged-layout-generator';

export class CityBlockGenerator {
    private readonly width: number = 32;
    private readonly height: number = 32;

    generate(): World {
        // Create a new world with fixed dimensions
        const world = new World(this.width, this.height);

        // Create and use the staged layout generator
        const layoutGenerator = new StagedLayoutGenerator(this.width, this.height);
        const layout = layoutGenerator.generate();

        // For now, we'll just return the world without processing the layout
        return world;
    }
} 