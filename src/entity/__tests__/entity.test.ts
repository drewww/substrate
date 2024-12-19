import { describe, it, expect, beforeEach } from 'vitest';
import { validate as uuidValidate } from 'uuid';
import { Entity } from '../entity';
import { PositionComponent } from '../component';
import { RequiredComponents } from '../decorators';
import { ComponentUnion } from '../component';

@RequiredComponents('position')
class PositionalEntity extends Entity {
  validate(): void {
    this.validateRequiredComponents();
  }
}

describe('Entity', () => {
  it('can be constructed with an explicit id', () => {
    const id = 'test-entity';
    const entity = new Entity(id);
    
    expect(entity).toBeInstanceOf(Entity);
    expect(entity.getId()).toBe(id);
  });

  it('generates valid UUIDs when no id provided', () => {
    const entity = new Entity();
    expect(uuidValidate(entity.getId())).toBe(true);
  });

  it('generates unique ids for different entities', () => {
    const entity1 = new Entity();
    const entity2 = new Entity();
    
    expect(entity1.getId()).not.toBe(entity2.getId());
    expect(uuidValidate(entity1.getId())).toBe(true);
    expect(uuidValidate(entity2.getId())).toBe(true);
  });

  it('can add and retrieve a component', () => {
    const entity = new Entity();
    const position = { type: 'position' as const, x: 10, y: 20 };
    
    entity.setComponent(position);
    const retrieved = entity.getComponent('position');
    
    expect(retrieved).toMatchObject(position);
  });

  it('can add and remove a component', () => {
    const entity = new Entity();
    const position: PositionComponent = { 
      type: 'position',
      x: 10, 
      y: 20 
    };

    entity.setComponent(position);
    expect(entity.hasComponent('position')).toBe(true);

    const removed = entity.removeComponent('position');
    expect(removed).toBe(true);
    expect(entity.hasComponent('position')).toBe(false);
    expect(entity.getComponent('position')).toBeUndefined();
  });

  describe('Required Components', () => {
    it('validates when required component is present', () => {
      const entity = new PositionalEntity();
      entity.setComponent({ 
        type: 'position', 
        x: 10, 
        y: 20 
      });

      expect(() => entity.validate()).not.toThrow();
    });

    it('throws when required component is missing', () => {
      const entity = new PositionalEntity();

      expect(() => entity.validate()).toThrow(
        /missing required component: position/
      );
    });

    it('throws when required component is removed', () => {
      const entity = new PositionalEntity();
      entity.setComponent({ 
        type: 'position', 
        x: 10, 
        y: 20 
      });

      entity.removeComponent('position');

      expect(() => entity.validate()).toThrow(
        /missing required component: position/
      );
    });
  });

  it('handles empty component list', () => {
    const original = new Entity('test-entity');
    const serialized = original.serialize();
    const deserialized = Entity.deserialize(serialized);

    expect(deserialized.getId()).toBe(original.getId());
    expect(deserialized.getComponentCount()).toBe(0);
  });

  describe('Component Queries', () => {
    let entity: Entity;

    beforeEach(() => {
      entity = new Entity();
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.setComponent({ type: 'health', current: 100, max: 100 });
    });

    describe('hasComponent', () => {
      it('returns true when component exists', () => {
        expect(entity.hasComponent('position')).toBe(true);
      });

      it('returns false when component does not exist', () => {
        expect(entity.hasComponent('nonexistent' as ComponentUnion['type'])).toBe(false);
      });
    });

    describe('hasAllComponents', () => {
      it('returns true when all components exist', () => {
        expect(entity.hasAllComponents(['position', 'health'])).toBe(true);
      });

      it('returns false when any component is missing', () => {
        expect(entity.hasAllComponents(['position', 'nonexistent' as ComponentUnion['type']])).toBe(false);
      });

      it('returns true for empty array', () => {
        expect(entity.hasAllComponents([])).toBe(true);
      });
    });

    describe('hasAnyComponents', () => {
      it('returns true when at least one component exists', () => {
        expect(entity.hasAnyComponents(['position', 'nonexistent' as ComponentUnion['type']])).toBe(true);
      });

      it('returns false when no components exist', () => {
        const nonexistent: ComponentUnion['type'][] = ['nonexistent1', 'nonexistent2'] as any;
        expect(entity.hasAnyComponents(nonexistent)).toBe(false);
      });

      it('returns false for empty array', () => {
        expect(entity.hasAnyComponents([])).toBe(false);
      });
    });

    describe('getComponentTypes', () => {
      it('returns all component types', () => {
        expect(entity.getComponentTypes()).toEqual(['position', 'health']);
      });

      it('returns empty array for entity with no components', () => {
        const emptyEntity = new Entity();
        expect(emptyEntity.getComponentTypes()).toEqual([]);
      });
    });

    describe('getComponentCount', () => {
      it('returns correct number of components', () => {
        expect(entity.getComponentCount()).toBe(2);
      });

      it('returns zero for entity with no components', () => {
        const emptyEntity = new Entity();
        expect(emptyEntity.getComponentCount()).toBe(0);
      });
    });

    describe('doesNotHaveComponents', () => {
      it('returns true when entity has none of the components', () => {
        const entity = new Entity();
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        expect(entity.doesNotHaveComponents(['health'])).toBe(true);
      });

      it('returns false when entity has any of the components', () => {
        const entity = new Entity();
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        entity.setComponent({ type: 'health', current: 100, max: 100 });
        expect(entity.doesNotHaveComponents(['position', 'nonexistent' as ComponentUnion['type']])).toBe(false);
      });

      it('returns true for empty array', () => {
        const entity = new Entity();
        expect(entity.doesNotHaveComponents([])).toBe(true);
      });

      it('returns true for empty entity', () => {
        const entity = new Entity();
        expect(entity.doesNotHaveComponents(['position', 'health'])).toBe(true);
      });
    });

    describe('Complex Component Queries', () => {
      it('can chain multiple query methods', () => {
        const entity = new Entity();
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        entity.setComponent({ type: 'health', current: 100, max: 100 });

        // Example: Entity has position but not health
        expect(
          entity.hasComponent('position') && 
          entity.doesNotHaveComponents(['health'])
        ).toBe(false);

        // Example: Entity has either position or health, and has all components
        expect(
          entity.hasAnyComponents(['position', 'health']) && 
          entity.hasAllComponents(['position', 'health'])
        ).toBe(true);
      });

      it('handles component removal in queries', () => {
        const entity = new Entity();
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        entity.setComponent({ type: 'health', current: 100, max: 100 });

        expect(entity.hasAllComponents(['position', 'health'])).toBe(true);
        
        entity.removeComponent('health');
        
        expect(entity.hasAllComponents(['position', 'health'])).toBe(false);
        expect(entity.hasAnyComponents(['position', 'health'])).toBe(true);
        expect(entity.doesNotHaveComponents(['health'])).toBe(true);
      });

      it('maintains correct component count through operations', () => {
        const entity = new Entity();
        
        expect(entity.getComponentCount()).toBe(0);
        
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        expect(entity.getComponentCount()).toBe(1);
        
        entity.setComponent({ type: 'health', current: 100, max: 100 });
        expect(entity.getComponentCount()).toBe(2);
        
        entity.removeComponent('health');
        expect(entity.getComponentCount()).toBe(1);
        
        entity.removeComponent('position');
        expect(entity.getComponentCount()).toBe(0);
      });

      it('correctly updates component types list', () => {
        const entity = new Entity();
        expect(entity.getComponentTypes()).toEqual([]);
        
        entity.setComponent({ type: 'position', x: 0, y: 0 });
        expect(entity.getComponentTypes()).toEqual(['position']);
        
        entity.setComponent({ type: 'health', current: 100, max: 100 });
        expect(entity.getComponentTypes()).toContain('position');
        expect(entity.getComponentTypes()).toContain('health');
        expect(entity.getComponentTypes()).toHaveLength(2);
        
        entity.removeComponent('position');
        expect(entity.getComponentTypes()).toEqual(['health']);
      });
    });
  });

  describe('Serialization', () => {
    it('can serialize and deserialize an empty entity', () => {
      const original = new Entity('test-id');
      const serialized = original.serialize();
      const deserialized = Entity.deserialize(serialized);

      expect(deserialized.getId()).toBe(original.getId());
      expect(deserialized.getComponentCount()).toBe(0);
    });

    it('can serialize and deserialize an entity with components', () => {
      const original = new Entity('test-id');
      original.setComponent({ type: 'position', x: 10, y: 20 });
      original.setComponent({ type: 'health', current: 100, max: 100 });

      const serialized = original.serialize();
      const deserialized = Entity.deserialize(serialized);

      expect(deserialized.getId()).toBe(original.getId());
      expect(deserialized.getComponent('position')).toMatchObject({ 
        type: 'position', 
        x: 10, 
        y: 20 
      });
      expect(deserialized.getComponent('health')).toMatchObject({ 
        type: 'health', 
        current: 100, 
        max: 100 
      });
    });

    it('preserves required components through serialization', () => {
      @RequiredComponents('position')
      class PositionalEntity extends Entity {
        validate(): void {
          this.validateRequiredComponents();
        }
      }

      const original = new PositionalEntity('test-id');
      original.setComponent({ type: 'position', x: 10, y: 20 });
      
      const serialized = original.serialize();
      const deserialized = PositionalEntity.deserialize(serialized);

      expect(() => deserialized.validate()).not.toThrow();
      expect(deserialized.getComponent('position')).toEqual(original.getComponent('position'));
    });

    it('can handle complex nested component data', () => {
      const original = new Entity('test-id');
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
      const original = new Entity('test-id');
      const components = [
        { type: 'position' as const, x: 10, y: 20 },
        { type: 'health' as const, current: 100, max: 100 }
      ];

      components.forEach(c => original.setComponent(c));
      
      const serialized = original.serialize();
      const deserialized = Entity.deserialize(serialized);

      expect(deserialized.getComponentTypes()).toEqual(original.getComponentTypes());
    });

    it('throws on invalid serialized data', () => {
      const invalidData = {
        // Missing id
        components: []
      };

      expect(() => Entity.deserialize(invalidData as any)).toThrow();
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
            const invalidData = {
                components: []
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: missing or invalid id'
            );
        });

        it('throws on non-string id', () => {
            const invalidData = {
                id: 123,
                components: []
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: missing or invalid id'
            );
        });

        it('throws on missing components array', () => {
            const invalidData = {
                id: 'test-id'
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: components must be an array'
            );
        });

        it('throws on non-array components', () => {
            const invalidData = {
                id: 'test-id',
                components: 'not an array'
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: components must be an array'
            );
        });

        it('throws on invalid component format', () => {
            const invalidData = {
                id: 'test-id',
                components: [
                    { notAType: 'position' }  // Missing 'type' field
                ]
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: invalid component format'
            );
        });

        it('throws on null component', () => {
            const invalidData = {
                id: 'test-id',
                components: [null]
            };
            expect(() => Entity.deserialize(invalidData as any)).toThrow(
                'Invalid serialized data: invalid component format'
            );
        });
    });
  });

  describe('Component Change Tracking', () => {
    let entity: Entity;

    beforeEach(() => {
      entity = new Entity();
    });

    it('marks component as modified when added', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      
      expect(entity.hasComponentChanged('position')).toBe(true);
      expect(entity.getComponent('position')?.modified).toBe(true);
    });

    it('tracks changes when component is updated', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.clearChanges();
      
      entity.setComponent({ type: 'position', x: 10, y: 20 });
      
      expect(entity.hasComponentChanged('position')).toBe(true);
      expect(entity.getComponent('position')?.modified).toBe(true);
    });

    it('clears modification flags', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.clearChanges();
      
      expect(entity.hasComponentChanged('position')).toBe(false);
      expect(entity.getComponent('position')?.modified).toBe(false);
    });

    it('tracks multiple component changes', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.setComponent({ type: 'health', current: 100, max: 100 });
      
      const changedComponents = entity.getChangedComponents();
      expect(changedComponents).toHaveLength(2);
      expect(changedComponents).toContain('position');
      expect(changedComponents).toContain('health');
    });

    it('maintains change flags through multiple updates', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.setComponent({ type: 'position', x: 10, y: 20 });
      
      expect(entity.hasComponentChanged('position')).toBe(true);
      expect(entity.getComponent('position')?.modified).toBe(true);
    });

    it('only clears flags for existing components', () => {
      entity.setComponent({ type: 'position', x: 0, y: 0 });
      entity.setComponent({ type: 'health', current: 100, max: 100 });
      entity.clearChanges();
      
      // Add new component after clearing
      entity.setComponent({ type: 'position', x: 10, y: 20 });
      
      expect(entity.hasComponentChanged('position')).toBe(true);
      expect(entity.hasComponentChanged('health')).toBe(false);
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