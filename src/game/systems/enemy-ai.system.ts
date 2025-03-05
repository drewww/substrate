import { World } from '../../world/world';
import { ActionHandler } from '../../action/action-handler';
import { Entity } from '../../entity/entity';
import { logger } from '../../util/logger';
import { EnemyAIComponent, EnemyAIType } from '../components/enemy-ai.component';
import { InertiaComponent } from '../components/inertia.component';
import { directionToPoint } from '../../util';
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
        const enemies = this.world.getEntitiesWithComponent('enemyAI');

        for (const enemy of enemies) {
            this.updateEnemy(enemy);
        }
    }

    private updateEnemy(enemy: Entity): void {
        const ai = enemy.getComponent('enemyAI') as EnemyAIComponent;

        let canSeePlayer = false;
        if(enemy.hasComponent('vision')) {
            canSeePlayer = this.world.canEntitySeeEntity(enemy, this.world.getPlayer());
        }

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
            case EnemyAIType.HELICOPTER:
                // TODO: Implement helicopter AI

                
                break;
            case EnemyAIType.PEDESTRIAN:      
            
                const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;   
                const moveCooldown = cooldowns?.getCooldown('move');

                if(moveCooldown && moveCooldown.ready) {
                    const currentPos = enemy.getPosition();
                    
                    // Check if entity is stuck in the same position
                    if (ai.lastPosition && 
                        currentPos.x === ai.lastPosition.x && 
                        currentPos.y === ai.lastPosition.y) {
                        // Force destination reset if we haven't moved
                        ai.destination = null;
                    }
                    
                    // Store current position for next tick comparison
                    ai.lastPosition = currentPos;

                    if(!ai.destination) {
                        const navPoints = this.world.getEntitiesWithComponent('pedestrian-navigation');
                        const sortedNavPoints = navPoints
                            .map(point => ({
                                point: point.getPosition(),
                                distance: Math.abs(point.getPosition().x - enemy.getPosition().x) + Math.abs(point.getPosition().y - enemy.getPosition().y)
                            }))
                            .sort((a, b) => a.distance - b.distance)
                            .slice(0, 6)
                            .filter(destination => destination.distance > 0) // don't pick current location
                            .filter(destination => !ai.previousDestination || 
                                (ai.previousDestination.x !== destination.point.x || ai.previousDestination.y !== destination.point.y))
                            .map(item => item.point);

                        if(sortedNavPoints.length > 0) {
                            ai.previousDestination = enemy.getPosition(); // Store current position as previous source
                            ai.destination = sortedNavPoints[Math.floor(Math.random() * sortedNavPoints.length)];
                            enemy.setComponent(ai);
                        }
                    }


                    if(ai.destination) {
                        const path = this.world.findPath(enemy.getPosition(), ai.destination);

                        if(path && path.length > 1) {
                            const nextPos = path[1];
                            this.actionHandler.execute({
                                type: 'entityMove',
                                entityId: enemy.getId(),
                                data: { to: nextPos }
                            });

                            if(nextPos.x === ai.destination.x && nextPos.y === ai.destination.y) {
                                ai.destination = null;
                            }
                        } else {
                            // Reset destination if no valid path is found
                            ai.destination = null;
                        }
                    }
                }

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
