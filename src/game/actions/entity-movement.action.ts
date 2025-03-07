import { ActionClass, BaseAction } from '../../action/action-handler';
import { World } from '../../world/world';
import { Point } from '../../types';
import { BumpingComponent } from '../../entity/components/bumping-component';
import { logger } from '../../util/logger';
import { VisionComponent } from '../../entity/components/vision-component';
import { FacingComponent } from '../../entity/components/facing-component';
import { LightEmitterComponent } from '../../entity/components/light-emitter-component';
import { ApplyTimestampComponent } from '../components/apply.timestamp.component';
import { ApplyTimestampType } from '../components/apply.timestamp.component';
import { TimestampComponent } from '../components/timestamp.component';
import { FollowableComponent } from '../../entity/components/followable-component';
import { MoveComponent } from '../components/move.component';
import { ObjectiveComponent } from '../components/objective.component';

interface EntityMoveActionData {
    to: Point;
    force?: boolean;
}

export const EntityMoveAction: ActionClass<EntityMoveActionData> = {
    canExecute(world: World, action: BaseAction<EntityMoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        const from = entity.getPosition();
        const to = action.data.to;

        let shouldIgnoreImpassable = action.data.force? true : false;
        let shouldIgnoreImpathable = false;
        // Get the move component to check ignoreImpassable and allowDiagonal
        const moveComponent = entity.getComponent('move') as MoveComponent;

        if(moveComponent?.ignoreImpassable) {
            shouldIgnoreImpassable = true;
        }

        const allowDiagonal = moveComponent?.allowDiagonal;

        if(entity.hasComponent('player')) {
            shouldIgnoreImpathable = true;
            logger.info(`ignoring impathable for player`);
        }

        // Check if this is a diagonal move
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);
        const isDiagonal = dx === 1 && dy === 1;

        // Block diagonal moves if not allowed by MoveComponent
        if (isDiagonal && !moveComponent?.allowDiagonal) {
            entity.setComponent(new BumpingComponent({
                x: to.x - from.x,
                y: to.y - from.y
            }));
            return false;
        }

        // For diagonal moves, check both cardinal directions are passable
        if (isDiagonal && allowDiagonal) {
            const horizontalPos = { x: to.x, y: from.y };
            const verticalPos = { x: from.x, y: to.y };
            
            if (!world.isPassable(from.x, from.y, horizontalPos.x, horizontalPos.y,shouldIgnoreImpassable, allowDiagonal, shouldIgnoreImpathable) ||
                !world.isPassable(from.x, from.y, verticalPos.x, verticalPos.y, shouldIgnoreImpassable, allowDiagonal, shouldIgnoreImpathable)) {
                entity.setComponent(new BumpingComponent({
                    x: to.x - from.x,
                    y: to.y - from.y
                }));
                return false;
            }
        }

        // Check if movement is possible
        if (!shouldIgnoreImpassable && !world.isPassable(from.x, from.y, to.x, to.y, shouldIgnoreImpassable, allowDiagonal, shouldIgnoreImpathable)) {           
            
            // if the destination tile has an active objective in it, toggle that objective status and emit "objective-complete" event
            const entitiesAtNewPos = world.getEntitiesAt(action.data.to);
            const objective = entitiesAtNewPos.find(e => e.hasComponent('objective') && (e.getComponent('objective') as ObjectiveComponent)?.active === true);
            if (objective) {
                // First emit the completion event
                world.emit('objective-complete', { objective });

                // Get all currently active objectives and deactivate them
                const activeObjectives = world.getEntitiesWithComponent('objective')
                    .filter(e => (e.getComponent('objective') as ObjectiveComponent)?.active === true);
                
                activeObjectives.forEach(e => {
                    logger.info(`deactivating objective: ${e.getId()}`);
                    const objComponent = e.getComponent('objective') as ObjectiveComponent;
                    objComponent.active = false;
                    e.setComponent(objComponent);  // This will trigger componentModified
                });
            }

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

        const currentPos = entity.getPosition();
        
        // Store the current position before moving if entity is followable
        if (entity.hasComponent('followable')) {
            const followable = entity.getComponent('followable') as FollowableComponent;
            followable.lastPosition = currentPos;
            entity.setComponent(followable);
        }

        const result = world.moveEntity(action.entityId, action.data.to);
        
        if (result) {
            // Handle turning if entity has a facing component
            if (entity.hasComponent('facing')) {
                const entitiesAtNewPos = world.getEntitiesAt(action.data.to);
                const turnEntity = entitiesAtNewPos.find(e => e.hasComponent('turn'));
                
                if (turnEntity && !turnEntity.hasComponent('enemyAI')) {

                    const turnFacing = turnEntity.getComponent('facing') as FacingComponent;
                    const turnDirection = turnFacing.direction;
                    const entityFacing = entity.getComponent('facing') as FacingComponent;
                    entityFacing.direction = turnDirection;
                    entity.setComponent(entityFacing);

                    // Update light emitter facing
                    const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
                    if (lightEmitter) {
                        // lightEmitter.config.facing = turnDirection;
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

        logger.info(`entities at new pos: ${entitiesAtNewPos.length}`);

        // check to see if the tile we're entering has components that need to be check
        for (const destinationEntity of entitiesAtNewPos) {
            if (destinationEntity.hasComponent('applyTimestamp')) {
                const applyTimestampComponent = destinationEntity.getComponent('applyTimestamp') as ApplyTimestampComponent;
                if (applyTimestampComponent.apply === ApplyTimestampType.Start) {
                    entity.setComponent(new TimestampComponent(performance.now()));
                } else if (applyTimestampComponent.apply === ApplyTimestampType.Stop) {
                    const timestamp = entity.getComponent('timestamp') as TimestampComponent;
                    if (timestamp) {
                        timestamp.checkAndUpdateBestTime(performance.now());
                    }
                }
            } else if (entity.hasComponent('player') && destinationEntity.hasComponent('objective')) {
                const objective = destinationEntity.getComponent('objective') as ObjectiveComponent;

                if(objective.active) {
                    world.emit('objective-complete', { objective: destinationEntity });
                }
            }
        }
        
        return result;
    }
}; 