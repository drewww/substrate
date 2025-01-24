import { ActionClass, BaseAction } from '../../../action/action-handler';
import { World } from '../../../world/world';
import { Point } from '../../../types';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';

interface PlayerMoveActionData {
    to: Point;
}

export const PlayerMoveAction: ActionClass<PlayerMoveActionData> = {
    canExecute(world: World, action: BaseAction<PlayerMoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        // Check cooldown
        // const cooldown = entity.getComponent('moveCooldown') as MoveCooldownComponent;
        // if (cooldown && cooldown.cooldown > 0) {
        //     logger.warn(`Failed cooldown check for player ${action.entityId}`);
        //     return false;
        // }

        const from = entity.getPosition();
        const to = action.data.to;

        // Check if movement is possible
        if (!world.isPassable(from.x, from.y, to.x, to.y)) {
            entity.setComponent(new BumpingComponent({
                x: to.x - from.x,
                y: to.y - from.y
            }));
            return false;
        }

        return true;
    },

    execute(world: World, action: BaseAction<PlayerMoveActionData>): boolean {
        logger.info(`executing player movement action`);
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        const result = world.moveEntity(action.entityId, action.data.to);
        
        // Reset cooldown
        const cooldown = entity.getComponent('moveCooldown') as MoveCooldownComponent;
        if (cooldown) {
            cooldown.cooldown = cooldown.baseTime;
            entity.setComponent(cooldown);
        }

        if (result && entity.hasComponent('player')) {
            world.updatePlayerVision(action.data.to);
        }
        
        return result;
    }
}; 