import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../world';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { Component } from '../../entity/component';
import { ComponentRegistry, RegisterComponent } from '../../entity/component-registry';
import { transient } from '../../decorators/transient';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { WallComponent, WallDirection } from '../../entity/components/wall-component';

const DEFAULT_POSITION: Point = { x: 0, y: 0 };

// Test-specific components
@RegisterComponent('test')
class TestComponent extends Component {
    readonly type = 'test';
    value: number = 100;
    
    @transient
    transientValue?: boolean;

    static fromJSON(data: any): TestComponent {
        const component = new TestComponent();
        component.value = data.value;
        return component;
    }
}

@RegisterComponent('updatable')
class UpdatableComponent extends Component {
    readonly type = 'updatable';
    value: number = 0;

    update(deltaTime: number): void {
        this.value += deltaTime;
    }

    static fromJSON(data: any): UpdatableComponent {
        const comp = new UpdatableComponent();
        comp.value = data.value;
        return comp;
    }
}

describe('World', () => {
    let world: World;
    const DEFAULT_SIZE = { x: 10, y: 10 };

    beforeEach(() => {
        world = new World(DEFAULT_SIZE.x, DEFAULT_SIZE.y);
    });

    describe('Basic World Operations', () => {
        it('initializes with correct size', () => {
            expect(world.getSize()).toEqual(DEFAULT_SIZE);
        });

        it('can add and retrieve an entity', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            
            const entitiesAtPosition = world.getEntitiesAt(DEFAULT_POSITION);
            expect(entitiesAtPosition).toHaveLength(1);
            expect(entitiesAtPosition[0]).toBe(entity);
        });

        it('can remove an entity', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            world.removeEntity(entity.getId());

            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('can move an entity', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const newPosition: Point = { x: 1, y: 1 };
            
            world.addEntity(entity);
            world.moveEntity(entity.getId(), newPosition);

            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
            expect(world.getEntitiesAt(newPosition)).toHaveLength(1);
            expect(world.getEntitiesAt(newPosition)[0]).toBe(entity);
        });
    });

    describe('Boundary Checks', () => {
        it('returns false when moving entity outside bounds', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            expect(world.moveEntity(entity.getId(), { x: -1, y: 0 })).toBe(false);
        });
    });

    describe('Entity Management', () => {
        it('maintains multiple entities at the same position', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            
            world.addEntity(entity1);
            world.addEntity(entity2);

            const entitiesAtPosition = world.getEntitiesAt(DEFAULT_POSITION);
            expect(entitiesAtPosition).toHaveLength(2);
            expect(entitiesAtPosition).toContain(entity1);
            expect(entitiesAtPosition).toContain(entity2);
        });

        it('correctly removes entity from spatial map', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            world.removeEntity(entity.getId());

            expect(world.getAllEntities()).toHaveLength(0);
            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('updates entity position when moved', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const newPosition: Point = { x: 1, y: 1 };
            
            world.addEntity(entity);
            world.moveEntity(entity.getId(), newPosition);

            expect(entity.getPosition()).toEqual(newPosition);
        });

        it('handles removing non-existent entity', () => {
            expect(() => world.removeEntity('non-existent-id')).not.toThrow();
        });

        it('returns false when moving non-existent entity', () => {
            expect(world.moveEntity('non-existent-id', DEFAULT_POSITION)).toBe(false);
        });
    });

    describe('Query Operations', () => {
        it('returns empty array for empty position', () => {
            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('returns all entities in the world', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity({ x: 1, y: 1 });

            world.addEntity(entity1);
            world.addEntity(entity2);

            const allEntities = world.getAllEntities();
            expect(allEntities).toHaveLength(2);
            expect(allEntities).toContain(entity1);
            expect(allEntities).toContain(entity2);
        });

        describe('Tag Queries', () => {
            it('finds entities by tag', () => {
                const entity1 = new Entity(DEFAULT_POSITION);
                const entity2 = new Entity(DEFAULT_POSITION);
                const entity3 = new Entity(DEFAULT_POSITION);

                entity1.addTag('enemy');
                entity2.addTag('enemy');
                entity2.addTag('flying');
                entity3.addTag('friendly');

                world.addEntity(entity1);
                world.addEntity(entity2);
                world.addEntity(entity3);

                const enemies = world.getEntitiesByTag('enemy');
                expect(enemies).toHaveLength(2);
                expect(enemies).toContain(entity1);
                expect(enemies).toContain(entity2);
            });

            it('finds entities with multiple tags', () => {
                const entity1 = new Entity(DEFAULT_POSITION);
                const entity2 = new Entity(DEFAULT_POSITION);

                entity1.addTags(['enemy', 'flying']);
                entity2.addTag('enemy');

                world.addEntity(entity1);
                world.addEntity(entity2);

                const flyingEnemies = world.getEntitiesWithTags(['enemy', 'flying']);
                expect(flyingEnemies).toHaveLength(1);
                expect(flyingEnemies[0]).toBe(entity1);
            });
        });

        describe('Component Queries', () => {
            it('finds entities with component', () => {
                const entity1 = new Entity(DEFAULT_POSITION);
                const entity2 = new Entity(DEFAULT_POSITION);

                entity1.setComponent(new UpdatableComponent());
                
                world.addEntity(entity1);
                world.addEntity(entity2);

                const entitiesWithComponent = world.getEntitiesWithComponent('updatable');
                expect(entitiesWithComponent).toHaveLength(1);
                expect(entitiesWithComponent[0]).toBe(entity1);
            });

            it('finds entities with multiple components', () => {
                const entity1 = new Entity(DEFAULT_POSITION);
                const entity2 = new Entity(DEFAULT_POSITION);

                entity1.setComponent(new TestComponent());
                entity1.setComponent(new UpdatableComponent());
                entity2.setComponent(new TestComponent());

                world.addEntity(entity1);
                world.addEntity(entity2);

                const entitiesWithBoth = world.getEntitiesWithComponents(['test', 'updatable']);
                expect(entitiesWithBoth).toHaveLength(1);
                expect(entitiesWithBoth[0]).toBe(entity1);
            });

            it('returns empty array when no entities match query', () => {
                const entity = new Entity(DEFAULT_POSITION);
                world.addEntity(entity);

                expect(world.getEntitiesByTag('nonexistent')).toHaveLength(0);
                expect(world.getEntitiesWithComponent('updatable')).toHaveLength(0);
                expect(world.getEntitiesWithTags(['nonexistent'])).toHaveLength(0);
                expect(world.getEntitiesWithComponents(['updatable'])).toHaveLength(0);
            });
        });
    });

    describe('Batch Operations', () => {
        it('can add multiple entities at once', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity({ x: 1, y: 1 });

            world.addEntities([entity1, entity2]);

            expect(world.getEntitiesAt(DEFAULT_POSITION)).toContain(entity1);
            expect(world.getEntitiesAt({ x: 1, y: 1 })).toContain(entity2);
            expect(world.getAllEntities()).toHaveLength(2);
        });

        it('maintains atomicity when batch adding entities', () => {
            const entity1 = new Entity({ x: 1, y: 1 });
            const entity2 = new Entity({ x: -1, y: 0 }); // Invalid position

            // Should fail to add any entities if one position is invalid
            expect(() => world.addEntities([entity1, entity2]))
                .toThrow(/Position .* is out of bounds/);

            expect(world.getAllEntities()).toHaveLength(0);
        });

        it('can remove multiple entities at once', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            const pos2: Point = { x: 1, y: 1 };

            world.addEntity(entity1);
            world.addEntity(entity2);

            world.removeEntities([entity1.getId(), entity2.getId()]);

            expect(world.getAllEntities()).toHaveLength(0);
            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
            expect(world.getEntitiesAt(pos2)).toHaveLength(0);
        });

        it('handles non-existent entities in batch removal', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);

            expect(() => world.removeEntities([
                entity.getId(),
                'non-existent-id'
            ])).not.toThrow();

            expect(world.getAllEntities()).toHaveLength(0);
        });
    });

    describe('Serialization', () => {
        it('can serialize and deserialize an empty world', () => {
            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            expect(deserialized.getSize()).toEqual(world.getSize());
            expect(deserialized.getAllEntities()).toHaveLength(0);
        });

        it('preserves entity positions after serialization', () => {
            const entity = new Entity({ x: 5, y: 5 });
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            const entities = deserialized.getEntitiesAt({ x: 5, y: 5 });
            expect(entities).toHaveLength(1);
            expect(entities[0].getPosition()).toEqual({ x: 5, y: 5 });
        });

        it('preserves entity components after serialization', () => {
            const entity = new Entity({ x: 5, y: 5 });
            entity.setComponent(new TestComponent());
            entity.setComponent(new UpdatableComponent());
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            const [restoredEntity] = deserialized.getEntitiesAt({ x: 5, y: 5 });
            expect(restoredEntity.getComponent('test')).toMatchObject({
                type: 'test',
                value: 100
            });
            expect(restoredEntity.getComponent('updatable')).toMatchObject({
                type: 'updatable',
                value: 0
            });
        });

        it('preserves entity tags after serialization', () => {
            const entity = new Entity(DEFAULT_POSITION);
            entity.addTags(['enemy', 'flying']);
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            const [restoredEntity] = deserialized.getEntitiesAt(DEFAULT_POSITION);
            expect(restoredEntity.hasTag('enemy')).toBe(true);
            expect(restoredEntity.hasTag('flying')).toBe(true);
        });

        it('preserves entity IDs after serialization', () => {
            const entity = new Entity(DEFAULT_POSITION, 'test-id');
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            const [restoredEntity] = deserialized.getEntitiesAt(DEFAULT_POSITION);
            expect(restoredEntity.getId()).toBe('test-id');
        });

        it('throws on invalid serialized data', () => {
            expect(() => World.deserialize({
                width: -1,  // Invalid width
                height: 10,
                entities: []
            })).toThrow(/Failed to deserialize world/);
            
            expect(() => World.deserialize({
                width: 10,
                height: 10,
                entities: [{ invalid: 'data' }] as any[]
            })).toThrow(/Failed to deserialize world/);
        });

        it('excludes transient properties during serialization', () => {
            const entity = new Entity(DEFAULT_POSITION);
            entity.setComponent(new TestComponent());
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);
            
            const component = deserialized.getEntities()[0].getComponent('test') as TestComponent;
            expect(component.transientValue).toBeUndefined();
        });

        it('handles complex world state with multiple entities and components', () => {
            // Create entities with different components and positions
            const player = new Entity({ x: 5, y: 5 }, 'player-1');
            player.addTags(['player', 'friendly']);
            player.setComponent(new TestComponent());
            
            const enemy1 = new Entity({ x: 1, y: 1 }, 'enemy-1');
            enemy1.addTags(['enemy', 'hostile']);
            enemy1.setComponent(new TestComponent());
            enemy1.setComponent(new UpdatableComponent());
            (enemy1.getComponent('test') as TestComponent).value = 50; // Modified value
            
            const enemy2 = new Entity({ x: 8, y: 8 }, 'enemy-2');
            enemy2.addTags(['enemy', 'hostile', 'flying']);
            enemy2.setComponent(new UpdatableComponent());
            (enemy2.getComponent('updatable') as UpdatableComponent).value = 100;

            // Add all entities to world
            world.addEntities([player, enemy1, enemy2]);

            // Serialize and deserialize
            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            // Verify world structure
            expect(deserialized.getAllEntities()).toHaveLength(3);
            expect(deserialized.getStats()).toEqual({
                entityCount: 3,
                uniqueComponentTypes: 2,
                uniqueTags: 5, // player, friendly, enemy, hostile, flying
                occupiedPositions: 3
            });

            // Verify player entity
            const deserializedPlayer = deserialized.getEntity('player-1');
            expect(deserializedPlayer).toBeDefined();
            expect(deserializedPlayer?.getPosition()).toEqual({ x: 5, y: 5 });
            expect(deserializedPlayer?.getTags()).toContain('player');
            expect(deserializedPlayer?.getTags()).toContain('friendly');
            expect(deserializedPlayer?.getComponent('test')).toMatchObject({
                type: 'test',
                value: 100 // Default value
            });

            // Verify first enemy
            const deserializedEnemy1 = deserialized.getEntity('enemy-1');
            expect(deserializedEnemy1).toBeDefined();
            expect(deserializedEnemy1?.getPosition()).toEqual({ x: 1, y: 1 });
            expect(deserializedEnemy1?.getTags()).toContain('enemy');
            expect(deserializedEnemy1?.getTags()).toContain('hostile');
            expect(deserializedEnemy1?.getComponent('test')).toMatchObject({
                type: 'test',
                value: 50 // Modified value
            });
            expect(deserializedEnemy1?.getComponent('updatable')).toMatchObject({
                type: 'updatable',
                value: 0
            });

            // Verify second enemy
            const deserializedEnemy2 = deserialized.getEntity('enemy-2');
            expect(deserializedEnemy2).toBeDefined();
            expect(deserializedEnemy2?.getPosition()).toEqual({ x: 8, y: 8 });
            expect(deserializedEnemy2?.getTags()).toContain('enemy');
            expect(deserializedEnemy2?.getTags()).toContain('hostile');
            expect(deserializedEnemy2?.getTags()).toContain('flying');
            expect(deserializedEnemy2?.getComponent('updatable')).toMatchObject({
                type: 'updatable',
                value: 100 // Modified value
            });
        });
    });

    describe('Spatial Queries', () => {
        it('finds entities in rectangular area', () => {
            const entity1 = new Entity({ x: 1, y: 1 });
            const entity2 = new Entity({ x: 2, y: 2 });
            const entity3 = new Entity({ x: 4, y: 4 }); // Outside area

            world.addEntities([entity1, entity2, entity3]);

            const entitiesInArea = world.getEntitiesInArea(
                { x: 0, y: 0 }, 
                { x: 2, y: 2 }
            );

            expect(entitiesInArea).toHaveLength(2);
            expect(entitiesInArea).toContain(entity1);
            expect(entitiesInArea).toContain(entity2);
            expect(entitiesInArea).not.toContain(entity3);
        });

        it('throws when area is out of bounds', () => {
            expect(() => world.getEntitiesInArea(
                { x: -1, y: 0 }, 
                { x: 2, y: 2 }
            )).toThrow('Area bounds are outside world boundaries');
        });

        it('finds nearest entities', () => {
            const center = new Entity({ x: 5, y: 5 });
            const near1 = new Entity({ x: 4, y: 5 }); // Distance 1
            const near2 = new Entity({ x: 6, y: 5 }); // Distance 1
            const far = new Entity({ x: 8, y: 8 });   // Distance 6

            world.addEntities([center, near1, near2, far]);

            const nearest = world.findNearestEntities({ x: 5, y: 5 }, 3);

            expect(nearest).toHaveLength(3);
            expect(nearest).toContain(near1);
            expect(nearest).toContain(near2);
            expect(nearest).not.toContain(far);
        });

        it('finds nearest entities with predicate', () => {
            const entity1 = new Entity({ x: 4, y: 5 });
            const entity2 = new Entity({ x: 6, y: 5 });
            entity2.addTag('special');

            world.addEntities([entity1, entity2]);

            const nearest = world.findNearestEntities(
                { x: 5, y: 5 }, 
                1, 
                entity => entity.hasTag('special')
            );

            expect(nearest).toHaveLength(1);
            expect(nearest[0]).toBe(entity2);
        });

        it('throws when reference position is out of bounds', () => {
            expect(() => world.findNearestEntities({ x: -1, y: 0 }))
                .toThrow('Reference position is outside world boundaries');
        });
    });

    describe('World State', () => {
        it('provides accurate world statistics', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity({ x: 1, y: 1 });

            entity1.addTag('enemy');
            entity1.setComponent(new TestComponent());
            entity2.addTag('friendly');
            entity2.setComponent(new UpdatableComponent());

            world.addEntities([entity1, entity2]);

            const stats = world.getStats();
            expect(stats.entityCount).toBe(2);
            expect(stats.uniqueComponentTypes).toBe(2); // test and updatable
            expect(stats.uniqueTags).toBe(2); // enemy and friendly
            expect(stats.occupiedPositions).toBe(2); // two different positions
        });

        it('clears all entities', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            expect(world.getAllEntities()).toHaveLength(1);

            world.clear();
            expect(world.getAllEntities()).toHaveLength(0);
            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('creates a deep clone of the world', () => {
            const entity = new Entity(DEFAULT_POSITION);
            entity.addTag('test');
            entity.setComponent(new TestComponent());
            world.addEntity(entity);

            const cloned = world.clone();
            
            // Verify same structure
            expect(cloned.getSize()).toEqual(world.getSize());
            expect(cloned.getAllEntities()).toHaveLength(1);
            
            // Verify deep copy
            const [clonedEntity] = cloned.getAllEntities();
            expect(clonedEntity.getId()).toBe(entity.getId());
            expect(clonedEntity.getPosition()).toEqual(entity.getPosition());
            expect(clonedEntity.hasTag('test')).toBe(true);
            expect(clonedEntity.getComponent('test')).toMatchObject({
                type: 'test',
                value: 100
            });

            // Verify independence
            world.clear();
            expect(world.isEmpty()).toBe(true);
            expect(cloned.isEmpty()).toBe(false);
        });

        it('checks if world is empty', () => {
            expect(world.isEmpty()).toBe(true);
            
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            expect(world.isEmpty()).toBe(false);
            
            world.removeEntity(entity.getId());
            expect(world.isEmpty()).toBe(true);
        });
    });

    describe('Entity Updates', () => {
        class UpdatableComponent extends Component {
            type = 'updatable' as const;
            value: number = 0;

            update(deltaTime: number): void {
                this.value += deltaTime;
            }

            static fromJSON(data: any): UpdatableComponent {
                const comp = new UpdatableComponent();
                comp.value = data.value;
                return comp;
            }
        }

        beforeEach(() => {
            // Register the updatable component
            ComponentRegistry.register('updatable', UpdatableComponent);
        });

        it('batch updates entity positions', () => {
            const handler = vi.fn();
            world.on('entityMoved', handler);

            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity({ x: 1, y: 1 });
            world.addEntities([entity1, entity2]);

            const updates = [
                { id: entity1.getId(), position: { x: 2, y: 2 } },
                { id: entity2.getId(), position: { x: 3, y: 3 } }
            ];

            world.updatePositions(updates);

            expect(entity1.getPosition()).toEqual({ x: 2, y: 2 });
            expect(entity2.getPosition()).toEqual({ x: 3, y: 3 });
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('maintains atomicity in batch position updates', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity({ x: 1, y: 1 });
            world.addEntities([entity1, entity2]);

            const updates = [
                { id: entity1.getId(), position: { x: 2, y: 2 } },
                { id: entity2.getId(), position: { x: -1, y: 0 } } // Invalid position
            ];

            expect(() => world.updatePositions(updates))
                .toThrow(/Position .* is out of bounds/);

            // Verify no changes were made
            expect(entity1.getPosition()).toEqual(DEFAULT_POSITION);
            expect(entity2.getPosition()).toEqual({ x: 1, y: 1 });
        });
    });

    describe('Event System', () => {
        let world: World;
        let entity: Entity;
        let handler: ReturnType<typeof vi.fn>;
        const position: Point = { x: 1, y: 1 };
        
        beforeEach(() => {
            world = new World(10, 10);
            entity = new Entity(position);
            handler = vi.fn();
        });

        describe('Component Events', () => {
            beforeEach(() => {
                world.addEntity(entity);
            });

            it('emits componentAdded when adding component', () => {
                world.on('componentAdded', handler);
                entity.setComponent(new TestComponent());
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    componentType: 'test'
                });
                expect(handler).toHaveBeenCalledTimes(1);
            });

            it('emits componentRemoved when removing component', () => {
                entity.setComponent(new TestComponent());
                world.on('componentRemoved', handler);
                
                entity.removeComponent('test');
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    componentType: 'test',
                    component: expect.objectContaining({
                        type: 'test',
                        value: 100
                    })
                });
            });
        });

        describe('Entity Events', () => {
            it('emits entityAdded when adding an entity', () => {
                world.on('entityAdded', handler);
                world.addEntity(entity);
                
                expect(handler).toHaveBeenCalledWith({ entity });
                expect(handler).toHaveBeenCalledTimes(1);
            });

            it('emits entityRemoved when removing an entity', () => {
                world.addEntity(entity);
                world.on('entityRemoved', handler);
                
                world.removeEntity(entity.getId());
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    position
                });
                expect(handler).toHaveBeenCalledTimes(1);
            });

            it('emits entityMoved when moving an entity', () => {
                world.addEntity(entity);
                world.on('entityMoved', handler);
                const newPos = { x: 2, y: 2 };
                
                world.moveEntity(entity.getId(), newPos);
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    from: position,
                    to: newPos
                });
                expect(handler).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Field of View', () => {
        let world: World;
        let player: Entity;
        
        beforeEach(() => {
            world = new World(10, 10);
            player = new Entity({ x: 5, y: 5 }); // Center of the map
            world.addEntity(player);
        });

        it('should initialize with empty FOV map', () => {
            const pos = { x: 3, y: 3 };
            expect(world.isLocationVisible(pos)).toBe(false);
        });

        it('should update visibility when player vision is updated', () => {
            world.updatePlayerVision(player.getPosition(), 3);
            
            // Check positions within vision radius
            expect(world.isLocationVisible({ x: 5, y: 5 })).toBe(true); // Player position
            expect(world.isLocationVisible({ x: 4, y: 4 })).toBe(true); // Diagonal within range
            expect(world.isLocationVisible({ x: 5, y: 3 })).toBe(true); // Straight line within range
            
            // Check positions outside vision radius
            expect(world.isLocationVisible({ x: 0, y: 0 })).toBe(false);
            expect(world.isLocationVisible({ x: 9, y: 9 })).toBe(false);
        });

        it('should handle opaque entities blocking vision', () => {
            // Create a wall between player and target
            const wall = new Entity({ x: 5, y: 4 });
            wall.setComponent(new OpacityComponent(true));
            world.addEntity(wall);

            world.updatePlayerVision(player.getPosition(), 3);

            // Position behind wall should not be visible
            expect(world.isLocationVisible({ x: 5, y: 3 })).toBe(false);
            
            // Positions not blocked by wall should still be visible
            expect(world.isLocationVisible({ x: 4, y: 4 })).toBe(true);
            expect(world.isLocationVisible({ x: 6, y: 4 })).toBe(true);
        });

        it('should update FOV when opaque entities move', () => {
            const wall = new Entity({ x: 5, y: 4 });
            wall.setComponent(new OpacityComponent(true));
            world.addEntity(wall);

            world.updatePlayerVision(player.getPosition(), 3);
            expect(world.isLocationVisible({ x: 5, y: 3 })).toBe(false);

            // Move wall
            world.moveEntity(wall.getId(), { x: 6, y: 4 });
            world.updatePlayerVision(player.getPosition(), 3);
            
            // Previously blocked position should now be visible
            expect(world.isLocationVisible({ x: 5, y: 3 })).toBe(true);
        });

        it('should track discovered locations', () => {
            world.updatePlayerVision(player.getPosition(), 3);
            const pos = { x: 4, y: 4 };
            
            // Position should be both visible and discovered
            expect(world.isLocationVisible(pos)).toBe(true);
            expect(world.isLocationDiscovered(pos)).toBe(true);

            // Move player away and update vision
            world.moveEntity(player.getId(), { x: 8, y: 8 });
            world.updatePlayerVision({ x: 8, y: 8 }, 3);

            // Position should no longer be visible but should remain discovered
            expect(world.isLocationVisible(pos)).toBe(false);
            expect(world.isLocationDiscovered(pos)).toBe(true);
        });
    });

    describe('Wall Management', () => {
        let world: World;
        const center = { x: 5, y: 5 };
        const defaultWallColor = '#FFFFFF';
        
        beforeEach(() => {
            world = new World(10, 10);
        });

        it('should initialize with no walls', () => {
            // A new world should have no wall entities
            const walls = world.getEntitiesWithComponent('wall');
            expect(walls).toHaveLength(0);
        });

        it('should set and get wall properties', () => {
            world.setWall(center, WallDirection.NORTH, {
                properties: [true, true, true],
                color: defaultWallColor
            });
            
            const wall = world.getEntitiesWithComponent('wall')[0]
                .getComponent('wall') as WallComponent;
            expect(wall.north.properties).toEqual([true, true, true]);
        });

        it('should handle wall direction translation correctly', () => {
            // Setting a south wall at (5,5) should create a north wall at (5,6)
            world.setWall(center, WallDirection.SOUTH, {
                properties: [true, true, true],
                color: defaultWallColor
            });

            const southPos = { x: 5, y: 6 };
            const wall = world.getEntitiesWithComponent('wall')
                .find(e => e.getPosition().x === southPos.x && e.getPosition().y === southPos.y)
                ?.getComponent('wall') as WallComponent;
            expect(wall.north.properties).toEqual([true, true, true]);

            // Setting an east wall at (5,5) should create a west wall at (6,5)
            world.setWall(center, WallDirection.EAST, {
                properties: [true, true, true],
                color: defaultWallColor
            });
            const eastPos = { x: 6, y: 5 };
            const eastWall = world.getEntitiesWithComponent('wall')
                .find(e => e.getPosition().x === eastPos.x && e.getPosition().y === eastPos.y)
                ?.getComponent('wall') as WallComponent;
            expect(eastWall.west.properties).toEqual([true, true, true]);
        });

        it('should handle out of bounds positions', () => {
            const outOfBounds = { x: -1, y: 0 };
            expect(world.setWall(outOfBounds, WallDirection.NORTH, {
                properties: [true, true, true],
                color: defaultWallColor
            })).toBe(false);
            
            const walls = world.getEntitiesWithComponent('wall');
            expect(walls).toHaveLength(0);
        });

        it('should remove walls when all properties are false', () => {
            world.setWall(center, WallDirection.NORTH, {
                properties: [true, true, true],
                color: defaultWallColor
            });
            expect(world.getEntitiesWithComponent('wall')).toHaveLength(1);

            world.setWall(center, WallDirection.NORTH, {
                properties: [false, false, false],
                color: defaultWallColor
            });
            expect(world.getEntitiesWithComponent('wall')).toHaveLength(0);
        });

        it('should maintain wall entity when at least one property is true', () => {
            world.setWall(center, WallDirection.NORTH, {
                properties: [true, true, true],
                color: defaultWallColor
            });
            world.setWall(center, WallDirection.WEST, {
                properties: [true, true, true],
                color: defaultWallColor
            });
            expect(world.getEntitiesWithComponent('wall')).toHaveLength(1);

            world.setWall(center, WallDirection.NORTH, {
                properties: [true, false, false],
                color: defaultWallColor
            });
            world.setWall(center, WallDirection.WEST, {
                properties: [false, false, false],
                color: defaultWallColor
            });
            expect(world.getEntitiesWithComponent('wall')).toHaveLength(1);

            const wall = world.getEntitiesWithComponent('wall')[0]
                .getComponent('wall') as WallComponent;
            expect(wall.north.properties).toEqual([true, false, false]);
            expect(wall.west.properties).toEqual([false, false, false]);
        });

        it('should set and get wall colors', () => {
            const customColor = '#FF0000';
            
            world.setWall(center, WallDirection.NORTH, {
                properties: [true, true, true],
                color: customColor
            });
            
            const wall = world.getEntitiesWithComponent('wall')[0]
                .getComponent('wall') as WallComponent;
            expect(wall.north.color).toBe(customColor);
        });

        it('should handle different colors for different directions', () => {
            const northColor = '#FF0000';
            const westColor = '#00FF00';
            
            world.setWall(center, WallDirection.NORTH, {
                properties: [true, true, true],
                color: northColor
            });
            world.setWall(center, WallDirection.WEST, {
                properties: [true, true, true],
                color: westColor
            });

            const wall = world.getEntitiesWithComponent('wall')[0]
                .getComponent('wall') as WallComponent;
            expect(wall.north.color).toBe(northColor);
            expect(wall.west.color).toBe(westColor);
        });
    });
}); 