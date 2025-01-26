import { ActionClass, BaseAction } from '../../../action/action-handler';
import { World } from '../../../world/world';
import { Point } from '../../../types';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { VisionComponent } from '../../../entity/components/vision-component';
import { FacingComponent } from '../../../entity/components/facing-component';
import { TurnComponent } from '../../../entity/components/turn-component';

interface EntityMoveActionData {
    to: Point;
}

export const EntityMoveAction: ActionClass<EntityMoveActionData> = {
    canExecute(world: World, action: BaseAction<EntityMoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

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

    execute(world: World, action: BaseAction<EntityMoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        const result = world.moveEntity(action.entityId, action.data.to);
        
        if (result) {
            // Handle turning if entity has a facing component
            if (entity.hasComponent('facing')) {
                const entitiesAtNewPos = world.getEntitiesAt(action.data.to);
                const turnEntity = entitiesAtNewPos.find(e => e.hasComponent('turn'));
                
                if (turnEntity) {
                    const turnComponent = turnEntity.getComponent('turn') as TurnComponent;
                    const facingComponent = entity.getComponent('facing') as FacingComponent;
                    facingComponent.direction = turnComponent.direction;
                    entity.setComponent(facingComponent);
                }
            }

            // Handle vision updates for player
            if (entity.hasComponent('player')) {
                const visionComponent = entity.getComponent('vision') as VisionComponent;
                const radius = visionComponent?.radius ?? 30;
                world.updateVision(action.data.to, radius);
            }
        }
        
        return result;
    }
}; 