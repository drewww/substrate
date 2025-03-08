// import { describe, it, expect } from 'vitest';
// import { JsonWorldGenerator } from '../json-world-generator';
// import { World } from '../../world';
// import { Entity } from '../../../entity/entity';
// import { ComponentRegistry } from '../../../entity/component-registry';
// import { SymbolComponent } from '../../../entity/components/symbol-component';
// import { OpacityComponent } from '../../../entity/components/opacity-component';
// import { ImpassableComponent } from '../../../entity/components/impassable-component';

// // Register components before tests
// ComponentRegistry.register('symbol', SymbolComponent);
// ComponentRegistry.register('opacity', OpacityComponent);
// ComponentRegistry.register('impassable', ImpassableComponent);

// describe('JsonWorldGenerator', () => {
//     const createTestWorld = (width: number, height: number, entities: any[]): World => {
//         const world = new World(width, height);
//         world.unready();
//         entities.forEach(entityData => {
//             const entity = Entity.deserialize(entityData);
//             world.addEntity(entity);
//         });
//         world.ready();
//         return world;
//     };

//     const serializeWorld = (world: World) => ({
//         version: '1.0',
//         width: world.getWorldWidth(),
//         height: world.getWorldHeight(),
//         entities: world.getEntities().map(entity => ({
//             id: entity.getId(),
//             position: entity.getPosition(),
//             components: Array.from(entity.getComponents()).map(component => 
//                 component.serialize()
//             )
//         }))
//     });

//     it('should preserve all entities and components during import/export cycle', async () => {
//         const testEntities = [
//             // Wall entity
//             {
//                 id: 'wall1',
//                 position: { x: 0, y: 0 },
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '#',
//                         foreground: '#666666',
//                         background: '#FFFFFF',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'opacity' },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Floor entity
//             {
//                 id: 'floor1',
//                 position: { x: 1, y: 1 },
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '.',
//                         foreground: '#FFFFFF',
//                         background: '#000000',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     }
//                 ]
//             }
//         ];

//         // Create original world
//         const originalWorld = createTestWorld(10, 10, testEntities);
//         const originalEntityCount = originalWorld.getEntities().length;

//         // Export to JSON
//         const exportData = serializeWorld(originalWorld);

//         // Import back
//         const generator = new JsonWorldGenerator(exportData);
//         const importedWorld = generator.generate();

//         // Verify entity counts
//         expect((await importedWorld).getEntities().length).toBe(originalEntityCount);

//         // Verify each entity has correct components
//         const countEntitiesByComponents = async (world: World, componentTypes: string[]) => {
//             return world.getEntities().filter(entity => {
//                 const components = Array.from(entity.getComponents());
//                 return components.length === componentTypes.length &&
//                        componentTypes.every(type => 
//                            components.some(comp => comp.type === type)
//                        );
//             }).length;
//         };

//         // Check wall-type entities (symbol + opacity + impassable)
//         expect(await countEntitiesByComponents(await importedWorld, ['symbol', 'opacity', 'impassable']))
//             .toBe(await countEntitiesByComponents(originalWorld, ['symbol', 'opacity', 'impassable']));

//         // Check floor-type entities (symbol only)
//         expect(await countEntitiesByComponents(await importedWorld, ['symbol']))
//             .toBe(await countEntitiesByComponents(originalWorld, ['symbol']));
//     });

//     it('should preserve component data during import/export cycle', async () => {
//         const testEntity = {
//             id: 'test1',
//             position: { x: 5, y: 5 },
//             components: [
//                 {
//                     type: 'symbol',
//                     char: '@',
//                     foreground: '#FF0000',
//                     background: '#000000',
//                     zIndex: 200,
//                     alwaysRenderIfExplored: false
//                 }
//             ]
//         };

//         const world = createTestWorld(10, 10, [testEntity]);
//         const exportData = serializeWorld(world);
//         const generator = new JsonWorldGenerator(exportData);
//         const importedWorld = generator.generate();

//         const originalEntity = world.getEntities()[0];
//         const importedEntity = (await importedWorld).getEntities()[0];

//         // Compare all component data
//         const originalComponents = Array.from(originalEntity.getComponents());
//         const importedComponents = Array.from(importedEntity.getComponents());

//         expect(importedComponents.length).toBe(originalComponents.length);

//         originalComponents.forEach((comp, i) => {
//             const importedComp = importedComponents[i] as typeof comp;
//             expect(JSON.stringify(importedComp.serialize()))
//                 .toBe(JSON.stringify(comp.serialize()));
//         });
//     });

//     it('should handle a large world with multiple entity types', async () => {
//         const entityTemplates = [
//             // Wall
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '#',
//                         foreground: '#666666',
//                         background: '#222222',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'opacity' },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Floor
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '.',
//                         foreground: '#444444',
//                         background: '#000000',
//                         zIndex: 1,
//                         alwaysRenderIfExplored: true
//                     }
//                 ]
//             },
//             // Window (transparent but impassable)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '□',
//                         foreground: '#88CCFF',
//                         background: '#000000',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Column (opaque and impassable)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '○',
//                         foreground: '#AAAAAA',
//                         background: '#000000',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'opacity' },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Fog (just opacity)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '~',
//                         foreground: '#AAAAAA',
//                         background: '#000000',
//                         zIndex: 150,
//                         alwaysRenderIfExplored: false
//                     },
//                     { type: 'opacity' }
//                 ]
//             }
//         ];

//         // Create a large set of test entities
//         const testEntities = [];
//         const worldWidth = 50;
//         const worldHeight = 50;

//         // Add entities in a pattern
//         for (let y = 0; y < worldHeight; y++) {
//             for (let x = 0; x < worldWidth; x++) {
//                 // Create walls around the edges
//                 if (x === 0 || x === worldWidth - 1 || y === 0 || y === worldHeight - 1) {
//                     testEntities.push({
//                         id: `wall_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[0].components]
//                     });
//                     continue;
//                 }

//                 // Create a floor everywhere
//                 testEntities.push({
//                     id: `floor_${x}_${y}`,
//                     position: { x, y },
//                     components: [...entityTemplates[1].components]
//                 });

//                 // Add some patterns of other entities
//                 if ((x + y) % 7 === 0) {
//                     // Windows in a diagonal pattern
//                     testEntities.push({
//                         id: `window_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[2].components]
//                     });
//                 } else if ((x * y) % 13 === 0) {
//                     // Columns in a scattered pattern
//                     testEntities.push({
//                         id: `column_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[3].components]
//                     });
//                 } else if ((x + y) % 11 === 0) {
//                     // Fog in another pattern
//                     testEntities.push({
//                         id: `fog_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[4].components]
//                     });
//                 }
//             }
//         }

//         // Create original world
//         const originalWorld = createTestWorld(worldWidth, worldHeight, testEntities);
//         const originalEntityCount = originalWorld.getEntities().length;

//         // Export to JSON
//         const exportData = serializeWorld(originalWorld);

//         // Import back
//         const generator = new JsonWorldGenerator(exportData);
//         const importedWorld = generator.generate();

//         // Verify total entity count
//         expect((await importedWorld).getEntities().length).toBe(originalEntityCount);

//         // Verify counts of each entity type
//         const countEntitiesByComponents = async (world: World, componentTypes: string[]) => {
//             return world.getEntities().filter(entity => {
//                 const components = Array.from(entity.getComponents());
//                 return components.length === componentTypes.length &&
//                        componentTypes.every(type => 
//                            components.some(comp => comp.type === type)
//                        );
//             }).length;
//         };

//         // Check each entity type
//         const entityTypes = [
//             ['symbol', 'opacity', 'impassable'], // walls and columns
//             ['symbol'], // floor
//             ['symbol', 'impassable'], // windows
//             ['symbol', 'opacity'] // fog
//         ];

//         entityTypes.forEach(async componentTypes => {
//             expect(await countEntitiesByComponents(await importedWorld, componentTypes))
//                 .toBe(await countEntitiesByComponents(originalWorld, componentTypes));
//         });

//         // Verify some specific positions
//         const getEntityAt = (world: World, x: number, y: number) => {
//             return world.getEntities().filter(async entity => {
//                 const pos = entity.getPosition();
//                 return pos.x === x && pos.y === y;
//             });
//         };

//         // Check corners (should be walls)
//         [[0, 0], [0, worldHeight-1], [worldWidth-1, 0], [worldWidth-1, worldHeight-1]].forEach(([x, y]) => {
//             const originalEntities = await getEntityAt(originalWorld, x, y);
//             const importedEntities = await getEntityAt(await importedWorld, x, y);
//             expect(importedEntities.length).toBe(originalEntities.length);
            
//             // Check that it's a wall (has all three components)
//             const importedWall = importedEntities.find(async entity => 
//                 Array.from(await entity.getComponents()).length === 3
//             );
//             expect(importedWall).toBeTruthy();
//         });
//     });

//     it('should handle a very large world with multiple entity types (>10k entities)', async () => {
//         const entityTemplates = [
//             // Wall
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '#',
//                         foreground: '#666666',
//                         background: '#222222',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'opacity' },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Floor
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '.',
//                         foreground: '#444444',
//                         background: '#000000',
//                         zIndex: 1,
//                         alwaysRenderIfExplored: true
//                     }
//                 ]
//             },
//             // Window (transparent but impassable)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '□',
//                         foreground: '#88CCFF',
//                         background: '#000000',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Column (opaque and impassable)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '○',
//                         foreground: '#AAAAAA',
//                         background: '#000000',
//                         zIndex: 100,
//                         alwaysRenderIfExplored: true
//                     },
//                     { type: 'opacity' },
//                     { type: 'impassable' }
//                 ]
//             },
//             // Fog (just opacity)
//             {
//                 components: [
//                     {
//                         type: 'symbol',
//                         char: '~',
//                         foreground: '#AAAAAA',
//                         background: '#000000',
//                         zIndex: 150,
//                         alwaysRenderIfExplored: false
//                     },
//                     { type: 'opacity' }
//                 ]
//             }
//         ];

//         const testEntities = [];
//         const worldWidth = 100;  // Increased from 50
//         const worldHeight = 100; // Increased from 50

//         // Add entities in a pattern
//         for (let y = 0; y < worldHeight; y++) {
//             for (let x = 0; x < worldWidth; x++) {
//                 // Create walls around the edges
//                 if (x === 0 || x === worldWidth - 1 || y === 0 || y === worldHeight - 1) {
//                     testEntities.push({
//                         id: `wall_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[0].components]
//                     });
//                     continue;
//                 }

//                 // Create multiple floor layers everywhere (3 layers for depth)
//                 for (let layer = 0; layer < 3; layer++) {
//                     testEntities.push({
//                         id: `floor_${x}_${y}_${layer}`,
//                         position: { x, y },
//                         components: [...entityTemplates[1].components]
//                     });
//                 }

//                 // Increase frequency of special entities
//                 // Windows every 5 cells
//                 if ((x + y) % 5 === 0) {
//                     testEntities.push({
//                         id: `window_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[2].components]
//                     });
//                 }

//                 // Columns every 7 cells
//                 if ((x * y) % 7 === 0) {
//                     testEntities.push({
//                         id: `column_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[3].components]
//                     });
//                 }

//                 // Fog every 4 cells
//                 if ((x + y) % 4 === 0) {
//                     testEntities.push({
//                         id: `fog_${x}_${y}`,
//                         position: { x, y },
//                         components: [...entityTemplates[4].components]
//                     });
//                 }

//                 // Additional decorative elements every 6 cells
//                 if ((x * x + y) % 6 === 0) {
//                     testEntities.push({
//                         id: `decor_${x}_${y}`,
//                         position: { x, y },
//                         components: [{
//                             type: 'symbol',
//                             char: '*',
//                             foreground: '#FFFF00',
//                             background: '#000000',
//                             zIndex: 75,
//                             alwaysRenderIfExplored: true
//                         }]
//                     });
//                 }
//             }
//         }

//         // Log the total number of entities for verification
//         console.log(`Total entities created: ${testEntities.length}`);

//         // Create original world
//         const originalWorld = createTestWorld(worldWidth, worldHeight, testEntities);
//         const originalEntityCount = originalWorld.getEntities().length;

//         // Export to JSON
//         const exportData = serializeWorld(originalWorld);

//         // Import back
//         const generator = new JsonWorldGenerator(exportData);
//         const importedWorld = generator.generate();

//         // Verify total entity count
//         expect((await importedWorld).getEntities().length).toBe(originalEntityCount);

//         // Verify counts of each entity type
//         const countEntitiesByComponents = async (world: World, componentTypes: string[]) => {
//             return world.getEntities().filter(entity => {
//                 const components = Array.from(entity.getComponents());
//                 return components.length === componentTypes.length &&
//                        componentTypes.every(type => 
//                            components.some(comp => comp.type === type)
//                        );
//             }).length;
//         };

//         // Check each entity type
//         const entityTypes = [
//             ['symbol', 'opacity', 'impassable'], // walls and columns
//             ['symbol'], // floor
//             ['symbol', 'impassable'], // windows
//             ['symbol', 'opacity'] // fog
//         ];

//         entityTypes.forEach(async componentTypes => {
//             expect(await countEntitiesByComponents(await importedWorld, componentTypes))
//                 .toBe(await countEntitiesByComponents(originalWorld, componentTypes));
//         });

//         // Verify some specific positions
//         const getEntityAt = (world: World, x: number, y: number) => {
//             return world.getEntities().filter(async entity => {
//                 const pos = entity.getPosition();
//                 return pos.x === x && pos.y === y;
//             });
//         };

//         // Check corners (should be walls)
//         [[0, 0], [0, worldHeight-1], [worldWidth-1, 0], [worldWidth-1, worldHeight-1]].forEach(([x, y]) => {
//             const originalEntities = await getEntityAt(originalWorld, x, y);
//             const importedEntities = await getEntityAt(await importedWorld, x, y);
//             expect(importedEntities.length).toBe(originalEntities.length);
            
//             // Check that it's a wall (has all three components)
//             const importedWall = importedEntities.find(async entity => 
//                 Array.from(await entity.getComponents()).length === 3
//             );
//             expect(importedWall).toBeTruthy();
//         });
//     });
// }); 