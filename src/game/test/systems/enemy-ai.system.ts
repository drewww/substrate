import { World } from '../../../world/world';
import { ActionHandler } from '../../../action/action-handler';
import { Entity } from '../../../entity/entity';
import { logger } from '../../../util/logger';
import { EnemyAIComponent } from '../components/enemy-ai.component';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { InertiaComponent } from '../components/inertia.component';
import { directionToPoint } from '../../../util';

export class EnemyAISystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {}

    tick(): void {
        // Get all enemies (entities with enemy component and AI component)
        // TODO we need to optimize this. iterating over all the immobile world tiles is not useful
        const enemies = this.world.getEntities()
            .filter(e => e.hasComponent('enemyAI'));

        for (const enemy of enemies) {
            this.updateEnemy(enemy);
        }
    }

    private updateEnemy(enemy: Entity): void {
        const ai = enemy.getComponent('enemyAI') as EnemyAIComponent;

        const canSeePlayer = this.world.canEntitySeeEntity(enemy, this.world.getPlayer());

        if(canSeePlayer) {
            ai.turnsLocked+=1
            // logger.warn(`Enemy at ${enemy.getPosition().x}, ${enemy.getPosition().y} can see player at ${this.world.getPlayer().getPosition().x}, ${this.world.getPlayer().getPosition().y}`);

            if(ai.turnsLocked > 6) {
                // fire a "projectile"

                // for now let's just add an entity at the player's position
                
                // compute the position of the projectile based on the player's inertia.
                const playerInertia = this.world.getPlayer().getComponent('inertia') as InertiaComponent;

                const playerFuturePos = {
                    x: this.world.getPlayer().getPosition().x + directionToPoint(playerInertia.direction).x*2,
                    y: this.world.getPlayer().getPosition().y + directionToPoint(playerInertia.direction).y*2
                }

                const projectile = new Entity(playerFuturePos);
                projectile.setComponent(new SymbolComponent('*', '#FFFFFFff', '#00000000', 1500));
                this.world.addEntity(projectile);

                ai.turnsLocked = 0;
            }
        } else {
            ai.turnsLocked = 0;
        }

        enemy.setComponent(ai);
    }
} 
