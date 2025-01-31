import { LEVEL_DATA } from '../../game/test/basic-test-game';
import { SYMBOL_DEFINITIONS } from '../../game/test/basic-test-game';
import { logger } from '../../util/logger';
import { PrefabWorldGenerator } from './prefab-world-generator';


export async function exportPrefabToJson(outputPath: string): Promise<void> {
    // Generate world using PrefabWorldGenerator
    const generator = new PrefabWorldGenerator(SYMBOL_DEFINITIONS, LEVEL_DATA);
    const world = generator.generate();

    // Create export data in JsonWorldGenerator format
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

    // Convert to JSON string with pretty printing
    const jsonString = JSON.stringify(exportData, null, 2);

    // In browser environment, trigger download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = outputPath;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Cleanup
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    logger.info('Exported prefab world to JSON');
} 