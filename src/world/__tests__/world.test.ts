import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../world';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';

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
            world.addEntity(entity, DEFAULT_POSITION);
            
            const entitiesAtPosition = world.getEntitiesAt(DEFAULT_POSITION);
            expect(entitiesAtPosition).toHaveLength(1);
            expect(entitiesAtPosition[0]).toBe(entity);
        });

        it('can remove an entity', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity, DEFAULT_POSITION);
            world.removeEntity(entity.getId());

            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('can move an entity', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const newPosition: Point = { x: 1, y: 1 };
            
            world.addEntity(entity, DEFAULT_POSITION);
            world.moveEntity(entity.getId(), newPosition);

            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
            expect(world.getEntitiesAt(newPosition)).toHaveLength(1);
            expect(world.getEntitiesAt(newPosition)[0]).toBe(entity);
        });
    });

    describe('Boundary Checks', () => {
        it('throws when adding entity outside bounds', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const outOfBounds: Point = { x: DEFAULT_SIZE.x + 1, y: 0 };
            
            expect(() => world.addEntity(entity, outOfBounds))
                .toThrow(/Position .* is out of bounds/);
        });

        it('throws when moving entity outside bounds', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const outOfBounds: Point = { x: -1, y: 0 };
            
            world.addEntity(entity, DEFAULT_POSITION);
            expect(() => world.moveEntity(entity.getId(), outOfBounds))
                .toThrow(/Position .* is out of bounds/);
        });
    });

    describe('Entity Management', () => {
        it('maintains multiple entities at the same position', () => {
            const entity1 = new Entity(DEFAULT_POSITION);
            const entity2 = new Entity(DEFAULT_POSITION);
            
            world.addEntity(entity1, DEFAULT_POSITION);
            world.addEntity(entity2, DEFAULT_POSITION);

            const entitiesAtPosition = world.getEntitiesAt(DEFAULT_POSITION);
            expect(entitiesAtPosition).toHaveLength(2);
            expect(entitiesAtPosition).toContain(entity1);
            expect(entitiesAtPosition).toContain(entity2);
        });

        it('correctly removes entity from spatial map', () => {
            const entity = new Entity(DEFAULT_POSITION);
            world.addEntity(entity, DEFAULT_POSITION);
            world.removeEntity(entity.getId());

            // Check both entity list and spatial map
            expect(world.getAllEntities()).toHaveLength(0);
            expect(world.getEntitiesAt(DEFAULT_POSITION)).toHaveLength(0);
        });

        it('updates entity position when moved', () => {
            const entity = new Entity(DEFAULT_POSITION);
            const newPosition: Point = { x: 1, y: 1 };
            
            world.addEntity(entity, DEFAULT_POSITION);
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
            const entity2 = new Entity(DEFAULT_POSITION);
            const pos2: Point = { x: 1, y: 1 };

            world.addEntity(entity1, DEFAULT_POSITION);
            world.addEntity(entity2, pos2);

            const allEntities = world.getAllEntities();
            expect(allEntities).toHaveLength(2);
            expect(allEntities).toContain(entity1);
            expect(allEntities).toContain(entity2);
        });
    });
}); 