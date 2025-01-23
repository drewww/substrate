import { World } from '../../../world/world';
import { Point } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';

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

    private movePlayer(player: Entity): void {
        const pos = player.getPosition();
        const directions = [
            { x: 0, y: -1 }, // up
            { x: 0, y: 1 },  // down
            { x: -1, y: 0 }, // left
            { x: 1, y: 0 }   // right
        ];
        
        // Pick a random direction
        const dir = directions[Math.floor(Math.random() * directions.length)];
        const newPos: Point = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };

        logger.info(`moving player to ${newPos.x}, ${newPos.y}`);

        // Use action handler with proper data structure
        this.actionHandler.execute({
            type: 'move',
            entityId: player.getId(),
            data: { to: newPos }
        });
    }
} 