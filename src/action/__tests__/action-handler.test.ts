import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { ActionHandler, MoveAction, AttackAction } from '../action-handler';
import { Point } from '../../types';
import { Component } from '../../entity/component';

// Mock health component for testing
class HealthComponent extends Component {
    readonly type = 'health';
    constructor(public current: number, public max: number) {
        super();
    }
}

describe('ActionHandler', () => {
    let world: World;
    let actionHandler: ActionHandler;
    let entity: Entity;
    let target: Entity;

    beforeEach(() => {
        world = new World(10, 10);
        actionHandler = new ActionHandler(world);
        
        // Register actions
        actionHandler.registerAction('move', MoveAction);
        actionHandler.registerAction('attack', AttackAction);

        // Create test entities
        entity = new Entity({ x: 0, y: 0 }, 'player');
        target = new Entity({ x: 1, y: 0 }, 'enemy');
        target.setComponent(new HealthComponent(100, 100));

        world.addEntity(entity);
        world.addEntity(target);
    });

    describe('Move Action', () => {
        it('allows valid moves', () => {
            const action = {
                type: 'move' as const,
                entityId: 'player',
                to: { x: 1, y: 1 }
            };

            expect(actionHandler.execute(action)).toBe(true);
            expect(entity.getPosition()).toEqual(action.to);
        });

        it('prevents out of bounds moves', () => {
            const action = {
                type: 'move' as const,
                entityId: 'player',
                to: { x: -1, y: 0 }
            };

            expect(actionHandler.execute(action)).toBe(false);
            expect(entity.getPosition()).toEqual({ x: 0, y: 0 });
        });

        it('prevents moving into blocked spaces', () => {
            // Create blocking entity
            const blocker = new Entity({ x: 1, y: 1 });
            blocker.addTag('blocks-movement');
            world.addEntity(blocker);

            const action = {
                type: 'move' as const,
                entityId: 'player',
                to: { x: 1, y: 1 }
            };

            expect(actionHandler.execute(action)).toBe(false);
            expect(entity.getPosition()).toEqual({ x: 0, y: 0 });
        });
    });

    describe('Attack Action', () => {
        it('allows attacks on adjacent targets', () => {
            const action = {
                type: 'attack' as const,
                entityId: 'player',
                targetId: 'enemy'
            };

            const initialHealth = (target.getComponent('health') as HealthComponent).current;
            expect(actionHandler.execute(action)).toBe(true);
            expect((target.getComponent('health') as HealthComponent).current).toBeLessThan(initialHealth);
        });

        it('prevents attacks on distant targets', () => {
            // Move target away
            world.moveEntity('enemy', { x: 5, y: 5 });

            const action = {
                type: 'attack' as const,
                entityId: 'player',
                targetId: 'enemy'
            };

            const initialHealth = (target.getComponent('health') as HealthComponent).current;
            expect(actionHandler.execute(action)).toBe(false);
            expect((target.getComponent('health') as HealthComponent).current).toBe(initialHealth);
        });

        it('fails gracefully when targeting non-existent entities', () => {
            const action = {
                type: 'attack' as const,
                entityId: 'player',
                targetId: 'nonexistent'
            };

            expect(actionHandler.execute(action)).toBe(false);
        });
    });

    describe('Action Handler', () => {
        it('handles unregistered action types', () => {
            const action = {
                type: 'unregistered' as const,
                entityId: 'player'
            };

            expect(actionHandler.execute(action)).toBe(false);
        });

        it('handles actions from non-existent entities', () => {
            const action = {
                type: 'move' as const,
                entityId: 'nonexistent',
                to: { x: 1, y: 1 }
            };

            expect(actionHandler.execute(action)).toBe(false);
        });
    });
}); 