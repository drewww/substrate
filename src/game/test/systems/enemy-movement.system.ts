import { World } from '../../../world/world';
import { Point } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';

export class EnemyMovementSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    update(deltaTime: number): void {
        const enemies = this.world.getEntities()
            .filter(e => e.hasComponent('moveCooldown'));

        for (const enemy of enemies) {
            const cooldown = enemy.getComponent('moveCooldown') as MoveCooldownComponent;
            
            cooldown.cooldown -= deltaTime;
            enemy.markComponentModified('moveCooldown');
            
            logger.verbose(`Enemy ${enemy.getId()} cooldown: ${cooldown.cooldown}`);
            
            if (cooldown.cooldown <= 0) {
                this.moveEnemy(enemy);
                cooldown.cooldown = cooldown.baseTime;
                enemy.markComponentModified('moveCooldown');
            }
        }
    }

    private moveEnemy(enemy: Entity): void {
        const pos = enemy.getPosition();
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

        // Use action handler with proper data structure
        this.actionHandler.execute({
            type: 'move',
            entityId: enemy.getId(),
            data: { to: newPos }
        });
    }
} 