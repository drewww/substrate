import { World } from '../../../world/world';
import { ActionHandler } from '../../../action/action-handler';
import { Entity } from '../../../entity/entity';
import { logger } from '../../../util/logger';
import { EnemyAIComponent, EnemyAIType } from '../components/enemy-ai.component';
import { InertiaComponent } from '../components/inertia.component';
import { directionToPoint } from '../../../util';
import { CooldownComponent } from '../components/cooldown.component';


export class EnemyAISystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {
    }

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


        switch (ai.aiType) {
            case EnemyAIType.FOLLOWER:
                if (canSeePlayer) {
                    ai.turnsLocked += 1
                } else {
                    ai.turnsLocked = 0;
                }

                if(ai.turnsLocked > 3) {
                    // move towards the player
                    const path = this.world.findPath(enemy.getPosition(), this.world.getPlayer().getPosition());
                    if(path && path.length > 1) {
                        const nextPos = path[1];

                        const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;   
                        const moveCooldown = cooldowns?.getCooldown('move');
                        
                        if(nextPos.x === enemy.getPosition().x && nextPos.y === enemy.getPosition().y) {
                            break;
                        }

                        if(moveCooldown && moveCooldown.ready) {
                            this.actionHandler.execute({
                                type: 'entityMove',
                                entityId: enemy.getId(),
                                data: { to: nextPos }
                            });
                        }
                    }
                }

                enemy.setComponent(ai);
                break;

            case EnemyAIType.EMP_TURRET:
                if (canSeePlayer) {
                    ai.turnsLocked += 1
                    // logger.warn(`Enemy at ${enemy.getPosition().x}, ${enemy.getPosition().y} can see player at ${this.world.getPlayer().getPosition().x}, ${this.world.getPlayer().getPosition().y}`);

                    if (ai.turnsLocked > 6) {
                        // compute the position of the projectile based on the player's inertia
                        const playerInertia = this.world.getPlayer().getComponent('inertia') as InertiaComponent;
                        let playerFuturePos = this.world.getPlayer().getPosition();
                        if (playerInertia && playerInertia.magnitude > 0) {
                            playerFuturePos = {
                                x: this.world.getPlayer().getPosition().x + directionToPoint(playerInertia.direction).x * 4,
                                y: this.world.getPlayer().getPosition().y + directionToPoint(playerInertia.direction).y * 4
                            }
                        }

                        this.actionHandler.execute({
                            type: 'createProjectile',
                            entityId: enemy.getId(),
                            data: {
                                position: playerFuturePos,
                                color: '#00ffd1FF',
                                cooldowns: {
                                    'explode-emp': {
                                        base: 8,
                                        current: 8,
                                        ready: false
                                    }
                                }
                            }
                        });

                        ai.turnsLocked = 0;
                    }
                } else {
                    ai.turnsLocked = 0;
                }

                enemy.setComponent(ai);
                break;
        }
    }
} 
