import { describe, it, expect, beforeEach } from 'vitest';
import { validate as uuidValidate } from 'uuid';
import { Entity } from '../entity';
import { Point } from '../../types';
import { RequiredComponents } from '../decorators';

// Default test position to use throughout tests
const DEFAULT_POSITION: Point = { x: 0, y: 0 };


describe('Entity', () => {
    describe('Basic Entity Operations', () => {
        it('can be constructed with an explicit id', () => {
            const id = 'test-entity';
            const entity = new Entity(DEFAULT_POSITION, id);
            
            expect(entity).toBeInstanceOf(Entity);
            expect(entity.getId()).toBe(id);
            expect(entity.getPosition()).toEqual(DEFAULT_POSITION);
        });

        it('generates valid UUIDs when no id provided', () => {
            const entity = new Entity(DEFAULT_POSITION);
            expect(uuidValidate(entity.getId())).toBe(true);
        });

        it('generates unique ids for different entities', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            
            expect(entity1.getId()).not.toBe(entity2.getId());
            expect(uuidValidate(entity1.getId())).toBe(true);
            expect(uuidValidate(entity2.getId())).toBe(true);
        });
    });

    describe('Component Management', () => {
        let entity: Entity;

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
        });

        it('can add and retrieve a component', () => {
            const health = { type: 'health' as const, current: 100, max: 100 };
            entity.setComponent(health);
            expect(entity.getComponent('health')).toMatchObject(health);
        });

        it('can add and remove a component', () => {
            const health = { type: 'health' as const, current: 100, max: 100 };
            
            entity.setComponent(health);
            expect(entity.hasComponent('health')).toBe(true);
            
            const removed = entity.removeComponent('health');
            expect(removed).toBe(true);
            expect(entity.hasComponent('health')).toBe(false);
            expect(entity.getComponent('health')).toBeUndefined();
        });

        describe('Component Queries', () => {
            beforeEach(() => {
                entity.setComponent({ type: 'health', current: 100, max: 100 });
            });

            it('returns true when component exists', () => {
                expect(entity.hasComponent('health')).toBe(true);
            });

            it('returns false when component does not exist', () => {
                expect(entity.hasComponent('nonexistent' as any)).toBe(false);
            });

            it('returns true when all components exist', () => {
                expect(entity.hasAllComponents(['health'])).toBe(true);
            });

            it('returns false when any component is missing', () => {
                expect(entity.hasAllComponents(['health', 'nonexistent' as any])).toBe(false);
            });

            it('returns true for empty array in hasAllComponents', () => {
                expect(entity.hasAllComponents([])).toBe(true);
            });

            it('returns true when at least one component exists', () => {
                expect(entity.hasAnyComponents(['health', 'nonexistent' as any])).toBe(true);
            });

            it('returns false when no components exist', () => {
                const nonexistent = ['nonexistent1', 'nonexistent2'] as any[];
                expect(entity.hasAnyComponents(nonexistent)).toBe(false);
            });

            it('returns false for empty array in hasAnyComponents', () => {
                expect(entity.hasAnyComponents([])).toBe(false);
            });
        });

        describe('Component Change Tracking', () => {
            it('tracks component modifications', () => {
                const health = { type: 'health' as const, current: 100, max: 100 };
                entity.setComponent(health);
                expect(entity.hasComponentChanged('health')).toBe(true);
            });

            it('clears modification flags', () => {
                const health = { type: 'health' as const, current: 100, max: 100 };
                entity.setComponent(health);
                entity.clearChanges();
                expect(entity.hasComponentChanged('health')).toBe(false);
            });
        });

        describe('Complex Component Queries', () => {
            beforeEach(() => {
                entity.setComponent({ type: 'position', x: 0, y: 0 });
                entity.setComponent({ type: 'health', current: 100, max: 100 });
            });

            it('can chain multiple query methods', () => {
                // Example: Entity has position but not health
                expect(
                    entity.hasComponent('position') && 
                    entity.doesNotHaveComponents(['nonexistent' as any])
                ).toBe(true);

                // Example: Entity has either position or health, and has all components
                expect(
                    entity.hasAnyComponents(['position', 'health']) && 
                    entity.hasAllComponents(['position', 'health'])
                ).toBe(true);
            });

            it('maintains correct component count through operations', () => {
                const testEntity = new Entity(DEFAULT_POSITION);
                
                expect(testEntity.getComponentCount()).toBe(0);
                
                testEntity.setComponent({ type: 'position', x: 0, y: 0 });
                expect(testEntity.getComponentCount()).toBe(1);
                
                testEntity.setComponent({ type: 'health', current: 100, max: 100 });
                expect(testEntity.getComponentCount()).toBe(2);
                
                testEntity.removeComponent('health');
                expect(testEntity.getComponentCount()).toBe(1);
                
                testEntity.removeComponent('position');
                expect(testEntity.getComponentCount()).toBe(0);
            });

            it('correctly updates component types list', () => {
                const testEntity = new Entity(DEFAULT_POSITION);
                expect(testEntity.getComponentTypes()).toEqual([]);
                
                testEntity.setComponent({ type: 'position', x: 0, y: 0 });
                expect(testEntity.getComponentTypes()).toEqual(['position']);
                
                testEntity.setComponent({ type: 'health', current: 100, max: 100 });
                expect(testEntity.getComponentTypes()).toContain('position');
                expect(testEntity.getComponentTypes()).toContain('health');
                expect(testEntity.getComponentTypes()).toHaveLength(2);
                
                testEntity.removeComponent('position');
                expect(testEntity.getComponentTypes()).toEqual(['health']);
            });
        });
    });

    describe('Position Management', () => {
        it('initializes with provided position', () => {
            const pos = { x: 10, y: 20 };
            const entity = new Entity(pos);
            expect(entity.getPosition()).toEqual(pos);
        });

        it('tracks position changes', () => {
            const entity = new Entity(DEFAULT_POSITION);
            entity.setPosition(10, 20);
            expect(entity.hasPositionChanged()).toBe(true);
            expect(entity.getPosition()).toEqual({ x: 10, y: 20 });
        });

        it('clears position changed flag', () => {
            const entity = new Entity(DEFAULT_POSITION);
            entity.setPosition(10, 20);
            entity.clearChanges();
            expect(entity.hasPositionChanged()).toBe(false);
        });
    });

    describe('Serialization', () => {
        it('can serialize and deserialize an entity', () => {
            const original = new Entity(DEFAULT_POSITION, 'test-id');
            original.setComponent({ type: 'health', current: 100, max: 100 });

            const serialized = original.serialize();
            const deserialized = Entity.deserialize(serialized);

            expect(deserialized.getId()).toBe(original.getId());
            expect(deserialized.getPosition()).toEqual(original.getPosition());
            expect(deserialized.getComponent('health')).toMatchObject(
                original.getComponent('health')!
            );
        });

        describe('deserialization errors', () => {
            it('throws on null data', () => {
                expect(() => Entity.deserialize(null as any)).toThrow(
                    'Invalid serialized data: must be an object'
                );
            });

            it('throws on non-object data', () => {
                expect(() => Entity.deserialize('not an object' as any)).toThrow(
                    'Invalid serialized data: must be an object'
                );
            });

            it('throws on missing id', () => {
                expect(() => Entity.deserialize({ 
                    position: DEFAULT_POSITION,
                    components: [] 
                } as any)).toThrow(
                    'Invalid serialized data: missing or invalid id'
                );
            });

            it('throws on missing position', () => {
                expect(() => Entity.deserialize({ 
                    id: 'test-id',
                    components: [] 
                } as any)).toThrow(
                    'Invalid serialized data: missing or invalid position'
                );
            });

            it('throws on invalid component format', () => {
                expect(() => Entity.deserialize({
                    id: 'test-id',
                    position: DEFAULT_POSITION,
                    components: [{ notAType: 'position' }]
                } as any)).toThrow(
                    'Invalid serialized data: invalid component format'
                );
            });
        });

        it('can handle complex nested component data', () => {
            const original = new Entity(DEFAULT_POSITION);
            const complexComponent = {
                type: 'position' as const,
                x: 10,
                y: 20,
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    source: 'user-input'
                }
            };

            original.setComponent(complexComponent);
            
            const serialized = original.serialize();
            const deserialized = Entity.deserialize(serialized);

            expect(deserialized.getComponent('position')).toMatchObject(complexComponent);
        });

        it('maintains component order through serialization', () => {
            const original = new Entity(DEFAULT_POSITION);
            const components = [
                { type: 'health' as const, current: 100, max: 100 },
                { type: 'position' as const, x: 10, y: 20 }
            ];

            components.forEach(c => original.setComponent(c));
            
            const serialized = original.serialize();
            const deserialized = Entity.deserialize(serialized);

            expect(deserialized.getComponentTypes()).toEqual(original.getComponentTypes());
        });
    });

    describe('Tags', () => {
        let entity: Entity;

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
        });

        it('can add and check tags', () => {
            entity.addTag('test');
            expect(entity.hasTag('test')).toBe(true);
        });

        it('can remove tags', () => {
            entity.addTag('test');
            entity.removeTag('test');
            expect(entity.hasTag('test')).toBe(false);
        });

        it('can add multiple tags', () => {
            entity.addTags(['test1', 'test2']);
            expect(entity.hasTag('test1')).toBe(true);
            expect(entity.hasTag('test2')).toBe(true);
        });

        it('can clear all tags', () => {
            entity.addTags(['test1', 'test2']);
            entity.clearTags();
            expect(entity.getTags()).toHaveLength(0);
        });
    });

    describe('Required Components', () => {
        @RequiredComponents('position')
        class PositionalEntity extends Entity {
            validate(): void {
                this.validateRequiredComponents();
            }
        }

        it('validates when required component is present', () => {
            const entity = new PositionalEntity(DEFAULT_POSITION);
            entity.setComponent({ type: 'position', x: 10, y: 20 });
            expect(() => entity.validate()).not.toThrow();
        });

        it('throws when required component is missing', () => {
            const entity = new PositionalEntity(DEFAULT_POSITION);
            expect(() => entity.validate()).toThrow(/missing required component: position/);
        });

        it('preserves required components through serialization', () => {
            const original = new PositionalEntity(DEFAULT_POSITION);
            original.setComponent({ type: 'position', x: 10, y: 20 });
            
            const serialized = original.serialize();
            const deserialized = PositionalEntity.deserialize(serialized);

            expect(() => deserialized.validate()).not.toThrow();
            expect(deserialized.getComponent('position')).toEqual(original.getComponent('position'));
        });
    });

    describe('Component Change Tracking', () => {
        let entity: Entity;

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
        });

        it('tracks multiple component changes', () => {
            entity.setComponent({ type: 'position', x: 0, y: 0 });
            entity.setComponent({ type: 'health', current: 100, max: 100 });
            
            const changedComponents = entity.getChangedComponents();
            expect(changedComponents).toHaveLength(2);
            expect(changedComponents).toContain('position');
            expect(changedComponents).toContain('health');
        });

        it('handles rapid changes within same frame', () => {
            entity.setComponent({ type: 'position', x: 0, y: 0 });
            entity.setComponent({ type: 'position', x: 10, y: 10 });
            entity.setComponent({ type: 'position', x: 20, y: 20 });
            
            // Should still just show as one change
            expect(entity.getChangedComponents()).toHaveLength(1);
            expect(entity.getComponent('position')).toEqual({
                type: 'position',
                x: 20,
                y: 20,
                modified: true
            });
        });
    });
}); 