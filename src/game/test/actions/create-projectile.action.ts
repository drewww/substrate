import { BaseAction, ActionClass } from '../../../action/action-handler';
import { World } from '../../../world/world';
import { Entity } from '../../../entity/entity';
import { Point } from '../../../types';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { CooldownComponent } from '../components/cooldown.component';

interface CreateProjectileData {
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

export interface CreateProjectileAction extends BaseAction<CreateProjectileData> {
    type: 'createProjectile';
}

export class CreateProjectileExecutor implements ActionClass<CreateProjectileData> {
    canExecute(world: World, action: CreateProjectileAction): boolean {
        const { position } = action.data;
        return world.isInBounds(position);
    }

    execute(world: World, action: CreateProjectileAction): boolean {
        const { position, color, cooldowns } = action.data;

        const projectile = new Entity(position);
        projectile.setComponent(new SymbolComponent('*', color, '#00000000', 1500));
        projectile.setComponent(new CooldownComponent(cooldowns));

        world.addEntity(projectile);
        return true;
    }
} 