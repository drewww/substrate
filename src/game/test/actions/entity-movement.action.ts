import { ActionClass, BaseAction } from '../../../action/action-handler';
import { World } from '../../../world/world';
import { Point } from '../../../types';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { VisionComponent } from '../../../entity/components/vision-component';
import { FacingComponent } from '../../../entity/components/facing-component';
import { TurnComponent } from '../../../entity/components/turn-component';
import { LightEmitterComponent } from '../../../entity/components/light-emitter-component';
import { ApplyTimestampComponent } from '../components/apply.timestamp.component';
import { ApplyTimestampType } from '../components/apply.timestamp.component';
import { TimestampComponent } from '../components/timestamp.component';

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
                    const turnDirection = turnComponent.direction;
                    const facingComponent = entity.getComponent('facing') as FacingComponent;
                    facingComponent.direction = turnComponent.direction;
                    entity.setComponent(facingComponent);

                    // Update light emitter facing
                    const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
                    if (lightEmitter) {
                        lightEmitter.config.facing = turnComponent.direction;
                        entity.setComponent(lightEmitter);
                    }
                }
            }

            // Handle vision updates for player
            if (entity.hasComponent('player')) {
                const visionComponent = entity.getComponent('vision') as VisionComponent;
                const radius = visionComponent?.radius ?? 30;
                world.updateVision(action.data.to, radius);
            }
        }

        // check to see if the tile we're entering has components that need to be checkd
        // right now those are 
        // EMP (currently handled elsewhere, need to migrate here)
        // ApplyTimestamp

        const entitiesAtNewPos = world.getEntitiesAt(action.data.to);
        for (const destinationEntity of entitiesAtNewPos) {
            if (destinationEntity.hasComponent('applyTimestamp')) {
                const applyTimestampComponent = destinationEntity.getComponent('applyTimestamp') as ApplyTimestampComponent;
                if (applyTimestampComponent.apply === ApplyTimestampType.Start) {
                    entity.setComponent(new TimestampComponent(performance.now()));
                } else if (applyTimestampComponent.apply === ApplyTimestampType.Stop) {
                    entity.removeComponent('timestamp');
                }
            }
        }
        
        return result;
    }
}; 