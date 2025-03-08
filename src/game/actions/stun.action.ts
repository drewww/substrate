import { BaseAction, ActionClass } from '../../action/action-handler';
import { World } from '../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { InertiaComponent } from '../components/inertia.component';
import { Direction } from '../../types';
import { logger } from '../../util/logger';
import { StunComponent } from '../components/stun.component';
import { MetricsComponent } from '../components/metrics.component';

interface StunActionData {
    duration: number;
    resetInertia?: boolean;
}

export const StunAction: ActionClass<StunActionData> = {
    canExecute(world: World, action: BaseAction<StunActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

 
        const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
        if(!cooldowns) return false;

        const stunState = cooldowns.getCooldown('stun');
        if(stunState) return false;

        return true;
    },

    execute(world: World, action: BaseAction<StunActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        const cooldowns = entity.getComponent('cooldown') as CooldownComponent;

        cooldowns.setCooldown('stun', action.data.duration, action.data.duration, true);
        cooldowns.setCooldown('move', 4, 4, false);
        entity.setComponent(cooldowns);

        // Reset inertia if requested
        if (action.data.resetInertia && entity.hasComponent('inertia')) {
            const inertia = entity.getComponent('inertia') as InertiaComponent;
            entity.setComponent(new InertiaComponent(
                inertia.direction ?? Direction.South,
                0
            ));
        }

        entity.setComponent(new StunComponent());

        logger.info(`Entity ${action.entityId} stunned for ${action.data.duration} ticks`);

        if(entity.hasComponent('metrics')) {
            const metrics = entity.getComponent('metrics') as MetricsComponent;
            metrics.timesCrashed += 1;
            entity.setComponent(metrics);
        }
        
        return true;
    }
} 