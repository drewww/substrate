import { exportPrefabToJson } from '../world/generators/prefab-to-json';
import { writeFileSync } from 'fs';
import { LEVEL_DATA } from '../game/test/basic-test-game';
import { SYMBOL_DEFINITIONS } from '../game/test/basic-test-game';
import { PrefabWorldGenerator } from '../world/generators/prefab-world-generator';

// Modified version for Node.js environment
function exportPrefabToJsonNode(outputPath: string): void {
    // Generate world using PrefabWorldGenerator
    const generator = new PrefabWorldGenerator(SYMBOL_DEFINITIONS, LEVEL_DATA);
    const world = generator.generate();

    // Create export data
    const exportData = {
        version: '1.0',
        width: world.getWorldWidth(),
        height: world.getWorldHeight(),
        entities: world.getEntities().map(entity => ({
            id: entity.getId(),
            position: entity.getPosition(),
            components: entity.getComponents().map(component => 
                component.serialize()
            )
        }))
    };

    // Write to file
    writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`Exported prefab world to ${outputPath}`);
}

// Run the export
const outputPath = process.argv[2] || 'level.json';
exportPrefabToJsonNode(outputPath); 