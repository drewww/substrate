import { World } from '../../world/world';
import { Point, Direction } from '../../types';
import { ActionHandler } from '../../action/action-handler';
import { CooldownComponent } from '../components/cooldown.component';
import { FacingComponent } from '../../entity/components/facing-component';
import { Entity } from '../../entity/entity';
import { logger } from '../../util/logger';

export class EnemyMovementSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    tick(): void {

        // THIS IS DANGEORUS and will pick up other entities indirectly, I suspect. Fix later.
        const enemies = this.world.getEntitiesWithComponent('cooldown').filter(e => !e.hasComponent('player') && e.hasComponent('facing'));

        let moved = false;
        for (const enemy of enemies) {
            const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;
            const facing = enemy.getComponent('facing') as FacingComponent;
            
            // Check move cooldown
            const moveState = cooldowns.getCooldown('move');

            // logger.info(`Enemy ${enemy.getId()} has move cooldown ready: ${moveState?.ready} and canMove: ${this.canMoveInDirection(enemy, facing.direction)}`);

            if (moveState?.ready && this.canMoveInDirection(enemy, facing.direction)) {
                this.moveEnemy(enemy, facing.direction);
                cooldowns.setCooldown('move', moveState.base);
                moved = true;
            }
        }

        if (moved) {
            this.world.updatePlayerVision();
        }
    }

    private canMoveInDirection(enemy: Entity, direction: Direction): boolean {
        const pos = enemy.getPosition();
        const oneAhead = this.getPositionInDirection(pos, direction);
        const twoAhead = this.getPositionInDirection(oneAhead, direction);

        // Check if two spaces ahead is impassable
        const entitiesTwoAhead = this.world.getEntitiesAt(twoAhead);
        if (entitiesTwoAhead.some(e => e.hasComponent('impassable'))) {
            return false;
        }

        // Check if immediate next space is passable
        return this.world.isPassable(pos.x, pos.y, oneAhead.x, oneAhead.y);
    }

    private getPositionInDirection(pos: Point, direction: Direction): Point {
        const newPos = { ...pos };
        switch (direction) {
            case Direction.North:
                newPos.y--;
                break;
            case Direction.South:
                newPos.y++;
                break;
            case Direction.West:
                newPos.x--;
                break;
            case Direction.East:
                newPos.x++;
                break;
        }
        return newPos;
    }

    private moveEnemy(enemy: Entity, direction: Direction): void {
        const pos = enemy.getPosition();
        const newPos = this.getPositionInDirection(pos, direction);

        this.actionHandler.execute({
            type: 'entityMove',
            entityId: enemy.getId(),
            data: { to: newPos }
        });
    }
} 