import { describe, it, expect } from 'vitest';
import { JsonWorldGenerator } from '../json-world-generator';
import { World } from '../../world';
import { Entity } from '../../../entity/entity';
import { ComponentRegistry } from '../../../entity/component-registry';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { OpacityComponent } from '../../../entity/components/opacity-component';
import { ImpassableComponent } from '../../../entity/components/impassable-component';

// Register components before tests
ComponentRegistry.register('symbol', SymbolComponent);
ComponentRegistry.register('opacity', OpacityComponent);
ComponentRegistry.register('impassable', ImpassableComponent);

describe('JsonWorldGenerator', () => {
    const createTestWorld = (width: number, height: number, entities: any[]): World => {
        const world = new World(width, height);
        world.unready();
        entities.forEach(entityData => {
            const entity = Entity.deserialize(entityData);
            world.addEntity(entity);
        });
        world.ready();
        return world;
    };

    const serializeWorld = (world: World) => ({
        version: '1.0',
        width: world.getWorldWidth(),
        height: world.getWorldHeight(),
        entities: world.getEntities().map(entity => ({
            id: entity.getId(),
            position: entity.getPosition(),
            components: Array.from(entity.getComponents()).map(component => 
                component.serialize()
            )
        }))
    });

    it('should preserve all entities and components during import/export cycle', () => {
        const testEntities = [
            // Wall entity
            {
                id: 'wall1',
                position: { x: 0, y: 0 },
                components: [
                    {
                        type: 'symbol',
                        char: '#',
                        foreground: '#666666',
                        background: '#FFFFFF',
                        zIndex: 100,
                        alwaysRenderIfExplored: true
                    },
                    { type: 'opacity' },
                    { type: 'impassable' }
                ]
            },
            // Floor entity
            {
                id: 'floor1',
                position: { x: 1, y: 1 },
                components: [
                    {
                        type: 'symbol',
                        char: '.',
                        foreground: '#FFFFFF',
                        background: '#000000',
                        zIndex: 100,
                        alwaysRenderIfExplored: true
                    }
                ]
            }
        ];

        // Create original world
        const originalWorld = createTestWorld(10, 10, testEntities);
        const originalEntityCount = originalWorld.getEntities().length;

        // Export to JSON
        const exportData = serializeWorld(originalWorld);

        // Import back
        const generator = new JsonWorldGenerator(exportData);
        const importedWorld = generator.generate();

        // Verify entity counts
        expect(importedWorld.getEntities().length).toBe(originalEntityCount);

        // Verify each entity has correct components
        const countEntitiesByComponents = (world: World, componentTypes: string[]) => {
            return world.getEntities().filter(entity => {
                const components = Array.from(entity.getComponents());
                return components.length === componentTypes.length &&
                       componentTypes.every(type => 
                           components.some(comp => comp.type === type)
                       );
            }).length;
        };

        // Check wall-type entities (symbol + opacity + impassable)
        expect(countEntitiesByComponents(importedWorld, ['symbol', 'opacity', 'impassable']))
            .toBe(countEntitiesByComponents(originalWorld, ['symbol', 'opacity', 'impassable']));

        // Check floor-type entities (symbol only)
        expect(countEntitiesByComponents(importedWorld, ['symbol']))
            .toBe(countEntitiesByComponents(originalWorld, ['symbol']));
    });

    it('should preserve component data during import/export cycle', () => {
        const testEntity = {
            id: 'test1',
            position: { x: 5, y: 5 },
            components: [
                {
                    type: 'symbol',
                    char: '@',
                    foreground: '#FF0000',
                    background: '#000000',
                    zIndex: 200,
                    alwaysRenderIfExplored: false
                }
            ]
        };

        const world = createTestWorld(10, 10, [testEntity]);
        const exportData = serializeWorld(world);
        const generator = new JsonWorldGenerator(exportData);
        const importedWorld = generator.generate();

        const originalEntity = world.getEntities()[0];
        const importedEntity = importedWorld.getEntities()[0];

        // Compare all component data
        const originalComponents = Array.from(originalEntity.getComponents());
        const importedComponents = Array.from(importedEntity.getComponents());

        expect(importedComponents.length).toBe(originalComponents.length);

        originalComponents.forEach((comp, i) => {
            const importedComp = importedComponents[i];
            expect(JSON.stringify(importedComp.serialize()))
                .toBe(JSON.stringify(comp.serialize()));
        });
    });
}); 