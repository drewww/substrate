import { BaseAction, ActionClass } from '../../action/action-handler';
import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { CooldownComponent } from '../components/cooldown.component';

// TODO this will need component data too
interface CreateEntityData {
    position: Point;
    color: string;
    cooldowns: {
        [key: string]: {
            base: number;
            current: number;
            ready: boolean;
        };
    };
}

export const CreateEntityAction: ActionClass<CreateEntityData> = {
    canExecute(world: World, action: BaseAction<CreateEntityData>): boolean {
        const { position } = action.data;
        return world.isInBounds(position);
    },

    execute(world: World, action: BaseAction<CreateEntityData>): boolean {
        const { position, color, cooldowns } = action.data;

        const projectile = new Entity(position);
        projectile.setComponent(new SymbolComponent('*', color, '#00000000', 1500));
        projectile.setComponent(new CooldownComponent(cooldowns));

        world.addEntity(projectile);
        return true;
    }
} 