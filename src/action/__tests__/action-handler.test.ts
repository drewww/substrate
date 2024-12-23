import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { ActionHandler, BaseAction, ActionClass } from '../action-handler';
import { Component } from '../../entity/component';

// Mock health component for testing
class HealthComponent extends Component {
    readonly type = 'health';
    constructor(public current: number, public max: number) {
        super();
    }
}

// Test-specific action types
interface MoveActionData {
    to: { x: number; y: number };
}

interface AttackActionData {
    targetId: string;
}

// Test action implementations
const TestMoveAction: ActionClass<MoveActionData> = {
    canExecute(world: World, action: BaseAction<MoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;
        
        const { x, y } = action.data.to;
        const size = world.getSize();
        return x >= 0 && x < size.x && y >= 0 && y < size.y;
    },

    execute(world: World, action: BaseAction<MoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;
        
        const newPos = world.moveEntity(action.entityId, action.data.to);
        return newPos !== undefined;
    }
};

const TestAttackAction: ActionClass<AttackActionData> = {
    canExecute(world: World, action: BaseAction<AttackActionData>): boolean {
        const attacker = world.getEntity(action.entityId);
        const target = world.getEntity(action.data.targetId);
        return !!(attacker && target && target.getComponent('health'));
    },

    execute(world: World, action: BaseAction<AttackActionData>): boolean {
        const target = world.getEntity(action.data.targetId);
        if (!target) return false;
        
        const health = target.getComponent('health') as HealthComponent;
        if (health) {
            health.current -= 10; // Test damage amount
            return true;
        }
        return false;
    }
};

describe('ActionHandler', () => {
    let world: World;
    let actionHandler: ActionHandler;
    let entity: Entity;
    let target: Entity;

    beforeEach(() => {
        world = new World(10, 10);
        actionHandler = new ActionHandler(world);
        
        // Register test actions
        actionHandler.registerAction('move', TestMoveAction);
        actionHandler.registerAction('attack', TestAttackAction);

        // Create test entities
        entity = new Entity({ x: 0, y: 0 }, 'player');
        target = new Entity({ x: 1, y: 0 }, 'enemy');
        target.setComponent(new HealthComponent(100, 100));

        world.addEntity(entity);
        world.addEntity(target);
    });

    describe('Move Action', () => {
        it('allows valid moves', () => {
            const action: BaseAction<MoveActionData> = {
                type: 'move',
                entityId: 'player',
                data: { to: { x: 1, y: 1 } }
            };

            expect(actionHandler.execute(action)).toBe(true);
            expect(entity.getPosition()).toEqual(action.data.to);
        });

        it('prevents out of bounds moves', () => {
            const action: BaseAction<MoveActionData> = {
                type: 'move',
                entityId: 'player',
                data: { to: { x: -1, y: 0 } }
            };

            expect(actionHandler.execute(action)).toBe(false);
            expect(entity.getPosition()).toEqual({ x: 0, y: 0 });
        });
    });

    describe('Attack Action', () => {
        it('allows attacks on adjacent targets', () => {
            const action: BaseAction<AttackActionData> = {
                type: 'attack',
                entityId: 'player',
                data: { targetId: 'enemy' }
            };

            const initialHealth = (target.getComponent('health') as HealthComponent).current;
            expect(actionHandler.execute(action)).toBe(true);
            expect((target.getComponent('health') as HealthComponent).current).toBeLessThan(initialHealth);
        });

        it('fails gracefully when targeting non-existent entities', () => {
            const action: BaseAction<AttackActionData> = {
                type: 'attack',
                entityId: 'player',
                data: { targetId: 'nonexistent' }
            };

            expect(actionHandler.execute(action)).toBe(false);
        });
    });

    describe('Action Handler', () => {
        it('handles unregistered action types', () => {
            const action: BaseAction<unknown> = {
                type: 'unregistered',
                entityId: 'player',
                data: {}
            };

            expect(actionHandler.execute(action)).toBe(false);
        });

        it('handles actions from non-existent entities', () => {
            const action: BaseAction<MoveActionData> = {
                type: 'move',
                entityId: 'nonexistent',
                data: { to: { x: 1, y: 1 } }
            };

            expect(actionHandler.execute(action)).toBe(false);
        });
    });
}); 