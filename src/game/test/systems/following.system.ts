import { World } from '../../../world/world';
import { ActionHandler } from '../../../action/action-handler';
import { Entity } from '../../../entity/entity';
import { FollowerComponent } from '../../../entity/components/follower-component';
import { Point } from '../../../types';
import { logger } from '../../../util/logger';

export class FollowingSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    update(deltaTime: number): void {
        const followers = this.world.getEntities()
            .filter(e => e.hasComponent('follower'));

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
            if (!this.pointsEqual(followedPos, followerComponent.lastKnownPosition)) {
                // Move to last known position
                if (followerComponent.lastKnownPosition) {
                    this.actionHandler.execute({
                        type: 'entityMove',
                        entityId: follower.getId(),
                        data: { to: followerComponent.lastKnownPosition }
                    });
                }
                followerComponent.lastKnownPosition = followedPos;
            }
        }
    }

    private findEntityToFollow(follower: Entity): void {
        const pos = follower.getPosition();
        const adjacentPositions = this.getAdjacentPositions(pos);

        for (const adjPos of adjacentPositions) {
            const entities = this.world.getEntitiesAt(adjPos)
                .filter(e => e.hasComponent('followable') && !e.hasComponent('player'));

            if (entities.length > 0) {
                const followedEntity = entities[0];
                const followerComponent = follower.getComponent('follower') as FollowerComponent;
                followerComponent.followedEntityId = followedEntity.getId();
                followerComponent.lastKnownPosition = pos;
                follower.setComponent(followerComponent);
                break;
            }
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