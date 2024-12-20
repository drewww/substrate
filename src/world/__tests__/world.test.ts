import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../world';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { Direction } from '../../types';
import { COMPONENT_TYPES, HealthComponent } from '../../entity/component';
import { FacingComponent } from '../../entity/component';
import { Component } from '../../entity/component';
import { transient } from '../../decorators/transient';
import { TestComponent } from '../../entity/__tests__/test-components';

describe('World', () => {
    let world: World;
    const DEFAULT_SIZE = { x: 10, y: 10 };
    const DEFAULT_POSITION: Point = { x: 0, y: 0 };

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
        it('throws when adding entity outside bounds', () => {
            const entity = new Entity({ x: DEFAULT_SIZE.x + 1, y: 0 });
            expect(() => world.addEntity(entity))
                .toThrow(/Position .* is out of bounds/);
        });

        it('throws when moving entity outside bounds', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity);
            expect(() => world.moveEntity(entity.getId(), { x: -1, y: 0 }))
                .toThrow(/Position .* is out of bounds/);
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

        it('throws when moving non-existent entity', () => {
            expect(() => world.moveEntity('non-existent-id', DEFAULT_POSITION))
                .toThrow(/Entity .* not found/);
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

                entity1.setComponent(new FacingComponent(Direction.North));
                
                world.addEntity(entity1);
                world.addEntity(entity2);

                const entitiesWithFacing = world.getEntitiesWithComponent('facing');
                expect(entitiesWithFacing).toHaveLength(1);
                expect(entitiesWithFacing[0]).toBe(entity1);
            });

            it('finds entities with multiple components', () => {
                const entity1 = new Entity(DEFAULT_POSITION);
                const entity2 = new Entity(DEFAULT_POSITION);

                entity1.setComponent(new HealthComponent(100, 100));
                entity1.setComponent(new FacingComponent(Direction.East));
                entity2.setComponent(new HealthComponent(100, 100));

                world.addEntity(entity1);
                world.addEntity(entity2);

                const entitiesWithBoth = world.getEntitiesWithComponents(['health', 'facing']);
                expect(entitiesWithBoth).toHaveLength(1);
                expect(entitiesWithBoth[0]).toBe(entity1);
            });

            it('returns empty array when no entities match query', () => {
                const entity = new Entity(DEFAULT_POSITION);
                world.addEntity(entity);

                expect(world.getEntitiesByTag('nonexistent')).toHaveLength(0);
                expect(world.getEntitiesWithComponent('facing')).toHaveLength(0);
                expect(world.getEntitiesWithTags(['nonexistent'])).toHaveLength(0);
                expect(world.getEntitiesWithComponents(['facing'])).toHaveLength(0);
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
            entity.setComponent(new HealthComponent(100, 100));
            entity.setComponent(new FacingComponent(Direction.North));
            world.addEntity(entity);

            const serialized = world.serialize();
            const deserialized = World.deserialize(serialized);

            const [restoredEntity] = deserialized.getEntitiesAt({ x: 5, y: 5 });
            expect(restoredEntity.getComponent('health')).toMatchObject({
                type: 'health',
                current: 100,
                max: 100
            });
            expect(restoredEntity.getComponent('facing')).toMatchObject({
                type: 'facing',
                direction: Direction.North
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
            expect(() => World.deserialize('invalid json'))
                .toThrow(/Failed to deserialize world/);
            
            expect(() => World.deserialize('{}'))
                .toThrow(/Failed to deserialize world/);
        });

        it('excludes transient properties during serialization', () => {
            // Create a test component with a transient property
            class TestComponent extends Component {
                type = 'test' as const;
                
                constructor(public value: number) {
                    super();
                }

                @transient
                testTransient: boolean = true;

                static fromJSON(data: any): TestComponent {
                    return new TestComponent(data.value);
                }
            }
            
            // Register the test component
            const originalTypes = { ...COMPONENT_TYPES };
            COMPONENT_TYPES['test'] = TestComponent;
            
            const entity = new Entity(DEFAULT_POSITION);
            const component = new TestComponent(100);
            entity.setComponent(component);
            world.addEntity(entity);
            
            const serialized = world.serialize();
            const parsed = JSON.parse(serialized);
            const serializedComponent = parsed.entities[0].components[0];
            
            // Verify the component was serialized but without the transient property
            expect(serializedComponent.value).toBe(100);
            expect(serializedComponent.testTransient).toBeUndefined();

            // Restore original component types
            Object.assign(COMPONENT_TYPES, originalTypes);
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
            entity1.setComponent(new HealthComponent(100, 100));
            entity2.addTag('friendly');
            entity2.setComponent(new FacingComponent(Direction.North));

            world.addEntities([entity1, entity2]);

            const stats = world.getStats();
            expect(stats.entityCount).toBe(2);
            expect(stats.uniqueComponentTypes).toBe(2); // health and facing
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
            entity.setComponent(new HealthComponent(100, 100));
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
            expect(clonedEntity.getComponent('health')).toMatchObject({
                type: 'health',
                current: 100,
                max: 100
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
            // Register the test component
            const originalTypes = { ...COMPONENT_TYPES };
            COMPONENT_TYPES['updatable'] = UpdatableComponent;
            return () => {
                Object.assign(COMPONENT_TYPES, originalTypes);
            };
        });

        it('updates components that support updating', () => {
            const handler = vi.fn();
            world.on('entityModified', handler);

            const entity = new Entity(DEFAULT_POSITION);
            const component = new UpdatableComponent();
            entity.setComponent(component);
            world.addEntity(entity);

            world.update(100);
            
            expect(handler).toHaveBeenCalledWith({
                entity,
                componentType: 'updatable'
            });
            const updatedComponent = entity.getComponent('updatable') as UpdatableComponent;
            expect(updatedComponent.value).toBe(100);
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
        const position: Point = { x: 1, y: 1 };
        
        beforeEach(() => {
            world = new World(10, 10);
            entity = new Entity(position);
        });

        describe('Entity Added Events', () => {
            it('emits entityAdded when adding an entity', () => {
                const handler = vi.fn();
                world.on('entityAdded', handler);
                
                world.addEntity(entity);
                
                expect(handler).toHaveBeenCalledWith({ entity });
            });

            it('sets world reference when adding entity', () => {
                const handler = vi.fn();
                world.on('entityModified', handler);
                
                world.addEntity(entity);
                entity.setComponent(new TestComponent());
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    componentType: 'test'
                });
            });
        });

        describe('Entity Modified Events', () => {
            it('emits entityModified when component is modified', () => {
                const handler = vi.fn();
                world.addEntity(entity);
                world.on('entityModified', handler);
                
                entity.setComponent(new TestComponent());
                
                expect(handler).toHaveBeenCalledWith({
                    entity,
                    componentType: 'test'
                });
            });

            it('includes correct component type in modification event', () => {
                const handler = vi.fn();
                world.addEntity(entity);
                world.on('entityModified', handler);
                
                entity.setComponent(new HealthComponent(100, 100));
                entity.setComponent(new TestComponent());
                
                expect(handler).toHaveBeenCalledTimes(2);
                expect(handler.mock.calls[0][0].componentType).toBe('health');
                expect(handler.mock.calls[1][0].componentType).toBe('test');
            });
        });

        describe('Event Handler Management', () => {
            it('allows removing specific event handlers', () => {
                const handler = vi.fn();
                world.on('entityAdded', handler);
                world.off('entityAdded', handler);
                
                world.addEntity(entity);
                
                expect(handler).not.toHaveBeenCalled();
            });

            it('clears all event handlers', () => {
                const handler1 = vi.fn();
                const handler2 = vi.fn();
                
                world.on('entityAdded', handler1);
                world.on('entityModified', handler2);
                
                world.clearEventHandlers();
                world.addEntity(entity);
                entity.setComponent(new TestComponent());
                
                expect(handler1).not.toHaveBeenCalled();
                expect(handler2).not.toHaveBeenCalled();
            });
        });
    });
}); 