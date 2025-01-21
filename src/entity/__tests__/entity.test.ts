import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { World } from '../../world/world';
import { Entity } from '../entity';
import { Point } from '../../types';
import { RequiredComponents } from '../decorators';
import { Component } from '../component';
import { RegisterComponent } from '../component-registry';
import { Direction } from '../../types';
import { SerializedEntity } from '../component';

// Default test position to use throughout tests
const DEFAULT_POSITION: Point = { x: 0, y: 0 };

// Test-specific components
@RegisterComponent('health')
class HealthComponent extends Component {
    readonly type = 'health';
    
    private _current: number;
    private _max: number;

    constructor(current: number = 100, max: number = 100) {
        super();
        this._current = current;
        this._max = max;
    }

    get current() { return this._current; }
    set current(value: number) { this._current = value; }

    get max() { return this._max; }
    set max(value: number) { this._max = value; }

    static fromJSON(data: any): HealthComponent {
        return new HealthComponent(data.current, data.max);
    }
}

@RegisterComponent('facing')
class FacingComponent extends Component {
    readonly type = 'facing';
    
    private _direction: Direction;

    constructor(direction: Direction = Direction.North) {
        super();
        this._direction = direction;
    }

    get direction() { return this._direction; }
    set direction(value: Direction) { this._direction = value; }

    static fromJSON(data: any): FacingComponent {
        return new FacingComponent(data.direction);
    }
}

// Rename to TestSymbolComponent to avoid conflict
@RegisterComponent('symbol')
class TestSymbolComponent extends Component {
    readonly type = 'symbol';
    
    private _char: string;
    private _foreground: string;
    private _background: string;

    constructor(char: string = '@', fg: string = 'white', bg: string = 'black') {
        super();
        this._char = char;
        this._foreground = fg;
        this._background = bg;
    }

    get char() { return this._char; }
    set char(value: string) { this._char = value; }

    get foreground() { return this._foreground; }
    set foreground(value: string) { this._foreground = value; }

    get background() { return this._background; }
    set background(value: string) { this._background = value; }

    static fromJSON(data: any): TestSymbolComponent {
        return new TestSymbolComponent(
            data.char,
            data.foreground,
            data.background
        );
    }
}

describe('Entity', () => {
    describe('Basic Entity Operations', () => {
        beforeEach(() => {
            // Reset the static counter before each test
            (Entity as any).nextId = 0;
        });

        it('can be constructed with an explicit id', () => {
            const id = 'test-entity';
            const entity = new Entity(DEFAULT_POSITION, id);
            
            expect(entity).toBeInstanceOf(Entity);
            expect(entity.getId()).toBe(id);
            expect(entity.getPosition()).toEqual(DEFAULT_POSITION);
        });

        it('generates sequential ids when no id provided', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            const entity3 = new Entity(DEFAULT_POSITION);
            
            expect(entity1.getId()).toBe('e0');
            expect(entity2.getId()).toBe('e1');
            expect(entity3.getId()).toBe('e2');
        });

        it('generates unique ids for different entities', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            
            expect(entity1.getId()).not.toBe(entity2.getId());
        });
    });

    describe('Component Management', () => {
        let entity: Entity;

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
        });

        it('can add and retrieve a component', () => {
            const health = new HealthComponent(100, 100);
            entity.setComponent(health);
            expect(entity.getComponent('health')).toMatchObject({
                type: 'health',
                current: 100,
                max: 100
            });
        });

        it('can add and remove a component', () => {
            const health = new HealthComponent(100, 100);
            
            entity.setComponent(health);
            expect(entity.hasComponent('health')).toBe(true);
            
            const removed = entity.removeComponent('health');
            expect(removed).toBeInstanceOf(HealthComponent);
            expect(entity.hasComponent('health')).toBe(false);
            expect(entity.getComponent('health')).toBeUndefined();
        });

        it('returns removed component when removing a component', () => {
            const health = new HealthComponent(100, 100);
            entity.setComponent(health);
            
            const removed = entity.removeComponent('health');
            expect(removed).toBeInstanceOf(HealthComponent);
            expect(removed).toMatchObject({
                type: 'health',
                current: 100,
                max: 100
            });
        });

        it('returns undefined when removing non-existent component', () => {
            const removed = entity.removeComponent('nonexistent');
            expect(removed).toBeUndefined();
        });

        describe('Component Queries', () => {
            beforeEach(() => {
                entity.setComponent(new HealthComponent(100, 100));
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

        describe('Complex Component Queries', () => {
            beforeEach(() => {
                entity.setComponent(new HealthComponent(100, 100));
                entity.setComponent(new FacingComponent(Direction.North));
            });

            it('can chain multiple query methods', () => {
                expect(
                    entity.hasComponent('health') && 
                    entity.doesNotHaveComponents(['nonexistent' as any])
                ).toBe(true);

                expect(
                    entity.hasAnyComponents(['health', 'facing']) && 
                    entity.hasAllComponents(['health', 'facing'])
                ).toBe(true);
            });

            it('maintains correct component count through operations', () => {
                const testEntity = new Entity(DEFAULT_POSITION);
                
                expect(testEntity.getComponentCount()).toBe(0);
                
                testEntity.setComponent(new HealthComponent(100, 100));
                expect(testEntity.getComponentCount()).toBe(1);
                
                testEntity.setComponent(new FacingComponent(Direction.North));
                expect(testEntity.getComponentCount()).toBe(2);
                
                testEntity.removeComponent('health');
                expect(testEntity.getComponentCount()).toBe(1);
                
                testEntity.removeComponent('facing');
                expect(testEntity.getComponentCount()).toBe(0);
            });

            it('correctly updates component types list', () => {
                const testEntity = new Entity(DEFAULT_POSITION);
                expect(testEntity.getComponentTypes()).toEqual([]);
                
                testEntity.setComponent(new HealthComponent(100, 100));
                expect(testEntity.getComponentTypes()).toEqual(['health']);
                
                testEntity.setComponent(new FacingComponent(Direction.North));
                expect(testEntity.getComponentTypes()).toContain('health');
                expect(testEntity.getComponentTypes()).toContain('facing');
                expect(testEntity.getComponentTypes()).toHaveLength(2);
                
                testEntity.removeComponent('health');
                expect(testEntity.getComponentTypes()).toEqual(['facing']);
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
            original.setComponent(new HealthComponent(100, 100));

            const serialized = original.serialize();
            const deserialized = Entity.deserialize(serialized);

            expect(deserialized.getId()).toBe(original.getId());
            expect(deserialized.getPosition()).toEqual(original.getPosition());
            expect(deserialized.getComponent('health')).toMatchObject({
                type: 'health',
                current: 100,
                max: 100
            });
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
            original.setComponent(new FacingComponent(Direction.North));
            
            const serialized = original.serialize();
            const deserialized = Entity.deserialize(serialized);

            expect(deserialized.getComponent('facing')).toMatchObject({
                type: 'facing',
                direction: Direction.North
            });
        });

        it('maintains component order through serialization', () => {
            const original = new Entity(DEFAULT_POSITION);
            const components = [
                new HealthComponent(100, 100),
                new FacingComponent(Direction.North)
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
        @RequiredComponents(['health'])
        class PositionalEntity extends Entity {}

        it('validates when required component is present', () => {
            const entity = new PositionalEntity(DEFAULT_POSITION);
            entity.setComponent(new HealthComponent(100, 100));
            expect(() => entity.validate()).not.toThrow();
        });

        it('throws when required component is missing', () => {
            const entity = new PositionalEntity(DEFAULT_POSITION);
            expect(() => entity.validate()).toThrow(/missing required component: health/);
        });

        it('preserves required components through serialization', () => {
            const original = new PositionalEntity(DEFAULT_POSITION);
            original.setComponent(new HealthComponent(100, 100));
            
            const serialized = original.serialize();
            const deserialized = PositionalEntity.deserialize(serialized);

            expect(() => deserialized.validate()).not.toThrow();
            expect(deserialized.getComponent('health')).toEqual(original.getComponent('health'));
        });
    });

    describe('Component Serialization', () => {
        let entity: Entity;

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
        });

        it('correctly serializes basic component data', () => {
            const health = new HealthComponent(100, 100);
            entity.setComponent(health);
            
            const serialized = entity.serialize();
            expect(serialized.components[0]).toEqual({
                type: 'health',
                current: 100,
                max: 100
            });
        });

        it('correctly deserializes basic component data', () => {
            const serializedData: SerializedEntity = {
                id: 'test',
                position: DEFAULT_POSITION,
                components: [{
                    type: 'health',
                    current: 100,
                    max: 100
                }] as any[] // Type assertion needed due to serialization format
            };

            const deserialized = Entity.deserialize(serializedData);
            const health = deserialized.getComponent('health') as HealthComponent;
            expect(health.current).toBe(100);
            expect(health.max).toBe(100);
        });

        it('skips transient properties during serialization', () => {
            const component = new HealthComponent(100, 100);
            component.modified = true; // This should be skipped
            entity.setComponent(component);
            
            const serialized = entity.serialize();
            expect(serialized.components[0]).not.toHaveProperty('modified');
        });

        it('maintains component state through serialize/deserialize cycle', () => {
            const symbol = new TestSymbolComponent('@', '#FF0000', '#000000');
            entity.setComponent(symbol);
            
            const serialized = entity.serialize();
            const deserialized = Entity.deserialize(serialized);
            
            const deserializedSymbol = deserialized.getComponent('symbol') as TestSymbolComponent;
            expect(deserializedSymbol).toMatchObject({
                char: '@',
                foreground: '#FF0000',
                background: '#000000',
            });
        });

        it('handles multiple components during serialization', () => {
            entity.setComponent(new HealthComponent(100, 100));
            entity.setComponent(new TestSymbolComponent('@'));
            
            const serialized = entity.serialize();
            expect(serialized.components).toHaveLength(2);
            expect(serialized.components.map(c => c.type)).toContain('health');
            expect(serialized.components.map(c => c.type)).toContain('symbol');
        });

        it('throws on invalid component type during deserialization', () => {
            const invalidData: SerializedEntity = {
                id: 'test',
                position: DEFAULT_POSITION,
                components: [{
                    type: 'nonexistent',
                    someData: 123
                }] as any[] // Type assertion needed for test
            };

            expect(() => Entity.deserialize(invalidData)).toThrow(/Unknown component type/);
        });
    });

    describe('Component Events', () => {
        let entity: Entity;
        let mockWorld: {
            onComponentAdded: ReturnType<typeof vi.fn>;
            onComponentModified: ReturnType<typeof vi.fn>;
            onComponentRemoved: ReturnType<typeof vi.fn>;
        };

        beforeEach(() => {
            entity = new Entity(DEFAULT_POSITION);
            mockWorld = {
                onComponentAdded: vi.fn(),
                onComponentModified: vi.fn(),
                onComponentRemoved: vi.fn()
            };
            entity.setWorld(mockWorld as unknown as World);
        });

        it('emits added event when component is first set', () => {
            const health = new HealthComponent(100, 100);
            entity.setComponent(health);
            
            expect(mockWorld.onComponentAdded).toHaveBeenCalledWith(entity, 'health');
            expect(mockWorld.onComponentModified).not.toHaveBeenCalled();
        });

        it('emits modified event when existing component is set', () => {
            const health1 = new HealthComponent(100, 100);
            const health2 = new HealthComponent(50, 100);
            
            entity.setComponent(health1);
            mockWorld.onComponentAdded.mockClear();
            
            entity.setComponent(health2);
            
            expect(mockWorld.onComponentModified).toHaveBeenCalledWith(entity, 'health');
            expect(mockWorld.onComponentAdded).not.toHaveBeenCalled();
        });

        it('emits removed event when component is removed', () => {
            const health = new HealthComponent(100, 100);
            entity.setComponent(health);
            entity.removeComponent('health');
            
            expect(mockWorld.onComponentRemoved).toHaveBeenCalledWith(entity, 'health', expect.any(HealthComponent));
        });

        it('does not emit events when no world is set', () => {
            entity.setWorld(null as unknown as World);
            const health = new HealthComponent(100, 100);
            
            entity.setComponent(health);
            entity.removeComponent('health');
            
            expect(mockWorld.onComponentAdded).not.toHaveBeenCalled();
            expect(mockWorld.onComponentModified).not.toHaveBeenCalled();
            expect(mockWorld.onComponentRemoved).not.toHaveBeenCalled();
        });
    });
}); 