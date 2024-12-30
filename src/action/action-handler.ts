import { World } from '../world/world';

// Base action type with generic extension
export interface BaseAction<T = any> {
    type: string;
    entityId: string;
    data: T;
}

// Type for action class constructors with generic support
export type ActionClass<T = any> = {
    canExecute(world: World, action: BaseAction<T>): boolean;
    execute(world: World, action: BaseAction<T>): boolean;
}

// Action handler manages execution of all actions
export class ActionHandler {
    private executors: Map<string, ActionClass>;

    constructor(private world: World) {
        this.executors = new Map();
    }

    registerAction<T>(type: string, executor: ActionClass<T>): void {
        this.executors.set(type, executor);
    }

    execute<T>(action: BaseAction<T>): boolean {
        const executor = this.executors.get(action.type) as ActionClass<T>;
        if (!executor) {
            return false;
        }

        // Check if action can be executed
        const canExecute = executor.canExecute(this.world, action);
        
        // Even if we can't execute, we still want any side effects from canExecute
        // (like adding the BumpingComponent) to be processed
        if (!canExecute) {
            return false;
        }

        return executor.execute(this.world, action);
    }
}




