import { describe, it, expect } from 'vitest';
import { Entity } from '../entity';

describe('Entity', () => {
  it('can be constructed with an id', () => {
    const id = 'test-entity';
    const entity = new Entity(id);
    
    expect(entity).toBeInstanceOf(Entity);
    expect(entity.getId()).toBe(id);
  });
}); 