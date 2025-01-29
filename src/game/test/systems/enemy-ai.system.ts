import { World } from '../../../world/world';
import { ActionHandler } from '../../../action/action-handler';
import { Entity } from '../../../entity/entity';
import { logger } from '../../../util/logger';

export class EnemyAISystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    tick(): void {
        // Get all enemies (entities with enemy component and AI component)
        // TODO we need to optimize this. iterating over all the immobile world tiles is not useful
        const enemies = this.world.getEntities()
            .filter(e => e.hasComponent('enemy') && !e.hasComponent('player') && e.hasComponent('enemyAI'));

        for (const enemy of enemies) {
            this.updateEnemy(enemy);
        }
    }

    private updateEnemy(enemy: Entity): void {
        const ai = enemy.getComponent('enemyAI');

        const canSeePlayer = this.world.canEntitySeeEntity(enemy, this.world.getPlayer());

        if(canSeePlayer) {
            logger.warn(`Enemy at ${enemy.getPosition().x}, ${enemy.getPosition().y} can see player at ${this.world.getPlayer().getPosition().x}, ${this.world.getPlayer().getPosition().y}`);
        }
    }
} 