import { World } from '../world/world';
import { Point } from '../types';
import { Component } from '../entity/component';
import { BumpingComponent } from '../entity/components/bumping-component';
import { logger } from '../util/logger';

// Base action type
export interface BaseAction {
    type: string;
    entityId: string;
}

// Type for action class constructors
export type ActionClass = {
    canExecute(world: World, action: BaseAction): boolean;
    execute(world: World, action: BaseAction): boolean;
}

// Action handler manages execution of all actions
export class ActionHandler {
    private executors: Map<string, ActionClass>;

    constructor(private world: World) {
        this.executors = new Map();
    }

    registerAction(type: string, executor: ActionClass): void {
        this.executors.set(type, executor);
    }

    execute(action: GameAction): boolean {
        const executor = this.executors.get(action.type);
        if (!executor) {
            return false;
        }

        if (!executor.canExecute(this.world, action)) {
            return false;
        }

        return executor.execute(this.world, action);
    }
}

// Example action types
export interface MoveAction extends BaseAction {
    type: 'move';
    to: Point;
}

export interface AttackAction extends BaseAction {
    type: 'attack';
    targetId: string;
}

export type GameAction = MoveAction | AttackAction | BaseAction;

// Health component interface for type safety
interface HealthComponent extends Component {
    current: number;
    max: number;
}

// Example action implementations
export class MoveAction {
    static canExecute(world: World, action: MoveAction): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        // Check world bounds using getSize()
        const worldSize = world.getSize();
        if (action.to.x < 0 || action.to.y < 0 || 
            action.to.x >= worldSize.x || 
            action.to.y >= worldSize.y) {
            return false;
        }

        // Check for impassable entities at the destination
        const entitiesAtDest = world.getEntitiesAt(action.to);
        const hasImpassable = entitiesAtDest.some(e => e.hasComponent('impassable'));
        
        if (hasImpassable) {
            // Add bumping component with direction
            const from = entity.getPosition();
            const direction = {
                x: action.to.x - from.x,
                y: action.to.y - from.y
            };
            logger.info('Bumping component added');
            entity.setComponent(new BumpingComponent(direction));
            return false;
        }

        return !hasImpassable;
    }

    static execute(world: World, action: MoveAction): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        world.moveEntity(action.entityId, action.to);
        return true;
    }
}

export class AttackAction {
    static canExecute(world: World, action: AttackAction): boolean {
        const attacker = world.getEntity(action.entityId);
        const target = world.getEntity(action.targetId);
        if (!attacker || !target) return false;

        // Check range
        const range = 1; // Could come from attacker's components
        const pos = attacker.getPosition();
        const targetPos = target.getPosition();
        const dx = Math.abs(pos.x - targetPos.x);
        const dy = Math.abs(pos.y - targetPos.y);
        
        return dx <= range && dy <= range;
    }

    static execute(world: World, action: AttackAction): boolean {
        const attacker = world.getEntity(action.entityId);
        const target = world.getEntity(action.targetId);
        if (!attacker || !target) return false;

        const damage = 10; // Could come from attacker's components
        const health = target.getComponent('health') as HealthComponent;
        if (health) {
            health.current -= damage;
            return true;
        }
        return false;
    }
}

// Usage example:
/*
const world = new World(10, 10);
const actionHandler = new ActionHandler(world);

// Register actions
actionHandler.registerAction('move', MoveAction);
actionHandler.registerAction('attack', AttackAction);

// Execute actions
actionHandler.execute({
    type: 'move',
    entityId: 'player1',
    to: { x: 5, y: 5 }
});

actionHandler.execute({
    type: 'attack',
    entityId: 'player1',
    targetId: 'enemy1'
});
*/ 