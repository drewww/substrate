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
import { MetricsComponent } from '../components/metrics.component';
import { StatusEffectComponent } from '../components/status-effect.component';
import { StatusEffect } from '../components/status-effect.component';
import { InertiaComponent } from '../components/inertia.component';
import { CooldownComponent } from '../components/cooldown.component';
import { Entity } from '../../entity/entity';

interface EntityMoveActionData {
    to: Point;
    force?: boolean;
}

// function checkAndHandleObjectives(world: World, position: Point) {
//     // Get objectives at this position
//     const entitiesAtPos = world.getEntitiesAt(position);
//     const objectives : Entity[] = entitiesAtPos.filter(e => {
//         const objComponent = e.getComponent('objective') as ObjectiveComponent;
//         return e.hasComponent('objective') && objComponent?.active === true;
//     });

//     objectives.forEach(objective => {
//         world.emit('objective-complete', { objective });
//         const objComponent = objective.getComponent('objective') as ObjectiveComponent;
//         objComponent.active = false;
        
//         objective.setComponent(objComponent);
//         objective.removeComponent('lightEmitter');
//     });
// }

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
                

                // Get all currently active objectives and deactivate them
                // const activeObjectives = world.getEntitiesWithComponent('objective')
                //     .filter(e => (e.getComponent('objective') as ObjectiveComponent)?.active === true);
                
                // activeObjectives.forEach(e => {
                //     logger.info(`deactivating objective: ${e.getId()}`);
                //     const objComponent = e.getComponent('objective') as ObjectiveComponent;
                //     objComponent.active = false;
                //     e.setComponent(objComponent);  // This will trigger componentModified
                // });

                // world.emit('objective-complete', { objective });
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
        
        if (result && entity.hasComponent('player')) {
            // Check the destination tile and all adjacent tiles for vehicle objectives
            const adjacentPositions = [
                { x: action.data.to.x, y: action.data.to.y },     // Current position
                { x: action.data.to.x + 1, y: action.data.to.y }, // Right
                { x: action.data.to.x - 1, y: action.data.to.y }, // Left
                { x: action.data.to.x, y: action.data.to.y + 1 }, // Down
                { x: action.data.to.x, y: action.data.to.y - 1 }, // Up
                { x: action.data.to.x + 1, y: action.data.to.y + 1 }, // Down-right
                { x: action.data.to.x - 1, y: action.data.to.y + 1 }, // Down-left
                { x: action.data.to.x + 1, y: action.data.to.y - 1 }, // Up-right
                { x: action.data.to.x - 1, y: action.data.to.y - 1 }, // Up-left
            ];

            // Check each position for vehicle objectives
            adjacentPositions.forEach(pos => {
                const entitiesAtPos = world.getEntitiesAt(pos);

                logger.info(`entities at pos: ${entitiesAtPos.map(e => e.getId()).join(", ")}`);
                const vehicleObjectives = entitiesAtPos.filter(e => {
                    const objComponent = e.getComponent('objective') as ObjectiveComponent;
                    return e.hasComponent('objective') && 
                           objComponent?.active === true && 
                           objComponent.objectiveType === 'vehicle';
                });

                logger.info(`vehicle objectives: ${vehicleObjectives.length}`);
                

                vehicleObjectives.forEach(objective => {
                   

                    // Get all currently active objectives and deactivate them
                    const activeObjectives = world.getEntitiesWithComponent('objective')
                        .filter(e => (e.getComponent('objective') as ObjectiveComponent)?.active === true);
                    
                    activeObjectives.forEach(e => {
                        logger.info(`deactivating objective: ${e.getId()}`);
                        const objComponent = e.getComponent('objective') as ObjectiveComponent;
                        objComponent.active = false;
                        e.setComponent(objComponent);
                        e.removeComponent('lightEmitter');
                    });

                     // First emit the completion event
                     world.emit('objective-complete', { objective });
                });
            });

           

            // Handle vision updates for player
            // const visionComponent = entity.getComponent('vision') as VisionComponent;
            // const radius = visionComponent?.radius ?? 30;
            // world.updateVision(action.data.to, radius);

            const metrics = entity.getComponent('metrics') as MetricsComponent;
            metrics.tilesTraveled += 1;
            entity.setComponent(metrics);
        }

         // Handle turning if entity has a facing component
         if (entity.hasComponent('facing')) {
            const entitiesAtNewPos = world.getEntitiesAt(action.data.to);
            const turnEntity = entitiesAtNewPos.find(e => e.hasComponent('turn'));
            
            // do not apply to active enemies
            if (turnEntity && !turnEntity.hasComponent('enemyAI')) {

                const turnFacing = turnEntity.getComponent('facing') as FacingComponent;
                const turnDirection = turnFacing.direction;
                const entityFacing = entity.getComponent('facing') as FacingComponent;
                entityFacing.direction = turnDirection;
                entity.setComponent(entityFacing);

                // Update light emitter facing
                // const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
                // if (lightEmitter) {
                //     // lightEmitter.config.facing = turnDirection;
                //     entity.setComponent(lightEmitter);
                // }
            }
        }

        // check to see if the tile we're entering has components that need to be checkd
        // right now those are 
        // EMP (currently handled elsewhere, need to migrate here)
        // ApplyTimestamp

        const entitiesAtNewPos = world.getEntitiesAt(action.data.to);

        // logger.info(`entities at new pos: ${entitiesAtNewPos.length}`);

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
                    objective.active = false;
                    destinationEntity.setComponent(objective);
                    destinationEntity.removeComponent('lightEmitter');
                }
            }


            if (entity.hasComponent('player') && destinationEntity.hasComponent('status-effect')) {
                const statusEffectState = destinationEntity.getComponent('status-effect') as StatusEffectComponent;

                if (statusEffectState.effect === StatusEffect.EMP) {
                    // ignore
                } else if (statusEffectState && statusEffectState.effect === StatusEffect.CALTROPS) {
                    // apply CALTROPS effect
                    if (entity.hasComponent('player')) {
                        const inertia = entity.getComponent('inertia') as InertiaComponent;
                        if (inertia) {
                            inertia.magnitude = 0;
                            inertia.resetInertia = true;
                            entity.setComponent(inertia);

                            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
                            if (cooldowns) {
                                cooldowns.setCooldown('move', 4, 4, false);
                                entity.setComponent(cooldowns);
                            }
                        }
                    }
                }
            } 
        }
        
        return result;
    }
}; 