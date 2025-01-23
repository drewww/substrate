import { World } from '../../../world/world';
import { Point, Direction } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';

export class PlayerMovementSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    update(deltaTime: number): void {
        const players = this.world.getEntities()
            .filter(e => e.hasComponent('moveCooldown') && e.hasComponent('player'));

        for (const player of players) {
            const cooldown = player.getComponent('moveCooldown') as MoveCooldownComponent;
            cooldown.cooldown -= deltaTime * 1000;
            
            // logger.info(`Player ${player.getId()} cooldown: ${cooldown.cooldown} and baseTime: ${cooldown.baseTime}`);
            
            if (cooldown.cooldown <= 0) {
                this.movePlayer(player);
                cooldown.cooldown = cooldown.baseTime;
            }

            player.setComponent(cooldown);
        }
    }

    private directionToPoint(direction: Direction): Point {
        switch (direction) {
            case Direction.North: return { x: 0, y: -1 };
            case Direction.South: return { x: 0, y: 1 };
            case Direction.West:  return { x: -1, y: 0 };
            case Direction.East:  return { x: 1, y: 0 };
        }
    }

    private movePlayer(player: Entity): void {
        const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;
        if (!bufferedMove) return;

        const pos = player.getPosition();
        const dir = this.directionToPoint(bufferedMove.direction);
        const newPos: Point = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };

        logger.info(`moving player to ${newPos.x}, ${newPos.y} based on buffered direction`);

        // Remove the buffered move component
        player.removeComponent('bufferedMove');

        // Execute the move
        this.actionHandler.execute({
            type: 'playerMove',
            entityId: player.getId(),
            data: { to: newPos }
        });
    }
} 