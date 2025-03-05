import { World } from '../../world/world';
import { ActionHandler } from '../../action/action-handler';
import { Entity } from '../../entity/entity';
import { FollowerComponent } from '../../entity/components/follower-component';
import { Point } from '../../types';
import { logger } from '../../util/logger';
import { FollowableComponent } from '../../entity/components/followable-component';

export class FollowingSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    tick(): void {
        const followers = this.world.getEntitiesWithComponent('follower');

        for (const follower of followers) {
            const followerComponent = follower.getComponent('follower') as FollowerComponent;
            
            if (!followerComponent.followedEntityId) {
                this.findEntityToFollow(follower);
                continue;
            }

            const followedEntity = this.world.getEntity(followerComponent.followedEntityId);
            if (!followedEntity || !followedEntity.hasComponent('followable')) {
                // Entity no longer exists or lost followable component
                followerComponent.followedEntityId = null;
                followerComponent.lastKnownPosition = null;
                follower.setComponent(followerComponent);

                logger.warn(`FollowingSystem: Lost followable component for entity ${follower.getId()}`);
                continue;
            }

            const followedPos = followedEntity.getPosition();
            const followable = followedEntity.getComponent('followable') as FollowableComponent;
            
            // If the followed entity has moved and has a valid last position
            if (followable.lastPosition && !this.pointsEqual(followedPos, followerComponent.lastKnownPosition)) {
                this.actionHandler.execute({
                    type: 'entityMove',
                    entityId: follower.getId(),
                    data: { to: followable.lastPosition, force: true }
                });
                followerComponent.lastKnownPosition = followedPos;
                follower.setComponent(followerComponent);
            }
        }
    }

    private findEntityToFollow(follower: Entity): void {
        const pos = follower.getPosition();
        const adjacentPositions = this.getAdjacentPositions(pos);

        // Collect all adjacent followable entities
        const followableEntities = adjacentPositions.flatMap(adjPos => 
            this.world.getEntitiesAt(adjPos)
                .filter(e => e.hasComponent('followable') && !e.hasComponent('player'))
                .map(e => ({
                    entity: e,
                    priority: (e.getComponent('followable') as FollowableComponent).followPriority
                }))
        );

        // Sort by priority (highest first) and take the highest priority entity
        if (followableEntities.length > 0) {
            const highestPriority = followableEntities.sort((a, b) => b.priority - a.priority)[0];
            const followerComponent = follower.getComponent('follower') as FollowerComponent;
            followerComponent.followedEntityId = highestPriority.entity.getId();
            followerComponent.lastKnownPosition = pos;
            follower.setComponent(followerComponent);
        }
    }

    private getAdjacentPositions(pos: Point): Point[] {
        return [
            { x: pos.x, y: pos.y - 1 }, // North
            { x: pos.x + 1, y: pos.y }, // East
            { x: pos.x, y: pos.y + 1 }, // South
            { x: pos.x - 1, y: pos.y }  // West
        ];
    }

    private pointsEqual(a: Point | null, b: Point | null): boolean {
        if (!a || !b) return false;
        return a.x === b.x && a.y === b.y;
    }
} 