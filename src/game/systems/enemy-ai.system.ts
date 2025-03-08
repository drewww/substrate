import { World } from '../../world/world';
import { ActionHandler } from '../../action/action-handler';
import { Entity } from '../../entity/entity';
import { logger } from '../../util/logger';
import { EnemyAIComponent, EnemyAIType } from '../components/enemy-ai.component';
import { InertiaComponent } from '../components/inertia.component';
import { directionToPoint } from '../../util';
import { CooldownComponent } from '../components/cooldown.component';
import { MoveComponent } from '../components/move.component';
import { LockedComponent } from '../components/locked.component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';


export class EnemyAISystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {
    }

    tick(totalUpdates?: number): void {
        // Get all enemies (entities with enemy component and AI component)
        // TODO we need to optimize this. iterating over all the immobile world tiles is not useful
        const enemies = this.world.getEntitiesWithComponent('enemyAI');

        for (const enemy of enemies) {
            this.updateEnemy(enemy, totalUpdates);
        }
    }

    private updateEnemy(enemy: Entity, totalUpdates?: number): void {
        const ai = enemy.getComponent('enemyAI') as EnemyAIComponent;

        let canSeePlayer = false;
        if(enemy.hasComponent('vision')) {
            canSeePlayer = this.world.canEntitySeeEntity(enemy, this.world.getPlayer());

            if(canSeePlayer) {
                // Lock the player when enemy sees them
                const player = this.world.getPlayer();
                let locked = player.getComponent('locked') as LockedComponent;

                if (!locked) {
                    locked = new LockedComponent(totalUpdates ?? 0, false);
                    player.setComponent(locked);
                } else {
                    // logger.warn(`Locking player at ${player.getPosition().x}, ${player.getPosition().y} and totalUpdates: ${totalUpdates}`);
                    locked.lastTurnLocked = totalUpdates ?? 0;
                    player.setComponent(locked);
                }

                // set rotation to point to the player
                const symbol = enemy.getComponent('symbol') as SymbolComponent;
                if(symbol) {

                    let rotationOffset = 0;
                    switch(ai.aiType) {
                        case EnemyAIType.CAMERA:
                            rotationOffset = Math.PI / 2 + Math.PI;
                            break;
                        case EnemyAIType.EMP_TURRET:
                            rotationOffset = Math.PI/2;
                            break;
                        case EnemyAIType.FOLLOWER:
                            rotationOffset = Math.PI/2;
                            break;
                    }

                    symbol.rotation = Math.atan2(player.getPosition().y - enemy.getPosition().y, player.getPosition().x - enemy.getPosition().x) + rotationOffset;

                    enemy.setComponent(symbol);
                }
            }
        }

        const symbol = enemy.getComponent('symbol') as SymbolComponent;
        if (symbol && canSeePlayer) {
            symbol.foreground = '#FFFFFFFF';

            if(ai.aiType === EnemyAIType.HELICOPTER) {
                symbol.background = '#FF194DFF';
            } else {
                symbol.background = '#FF194DFF';
            }
        } else if (symbol && !canSeePlayer) {

            if(ai.aiType === EnemyAIType.CAMERA) {
                symbol.background = '#A0A0A0FF';
                symbol.foreground = '#FF194DFF';
            } else if (ai.aiType === EnemyAIType.HELICOPTER) {
                symbol.background = '#FFFFFF00';
                symbol.foreground = '#FFFFFFFF';
            }
            

        }

        enemy.setComponent(symbol);

        switch (ai.aiType) {
            case EnemyAIType.CAMERA:
                // does nothing, but having an AI triggers the lock logic above.

               
                break;
            case EnemyAIType.HELICOPTER:

                const playerLocked = this.world.getPlayer().getComponent('locked') as LockedComponent;

                if(canSeePlayer || playerLocked) {
                    this.moveTowardsPlayer(enemy);
                }

                break;

            case EnemyAIType.FOLLOWER:
                if (canSeePlayer) {
                    ai.turnsLocked += 1;
                    // Reset distance when we see the player
                    ai.distanceTraveled = 0;
                } else {
                    ai.turnsLocked = 0;
                }

                // Track distance traveled
                if (ai.lastPosition) {
                    const currentPos = enemy.getPosition();
                    const dx = currentPos.x - ai.lastPosition.x;
                    const dy = currentPos.y - ai.lastPosition.y;
                    const moveDist = Math.sqrt(dx * dx + dy * dy);
                    ai.distanceTraveled += moveDist;
                }
                ai.lastPosition = enemy.getPosition();

                // Check if we should explode due to distance
                if (ai.distanceTraveled > 7) {
                    logger.warn("FOLLOWER SELF-DESTRUCTING DUE TO DISTANCE");
                    this.createExplosion(enemy);
                    this.world.removeEntity(enemy.getId());
                    return;
                }

                if(ai.turnsLocked > 3) {
                    // move towards the player
                    this.moveTowardsPlayer(enemy);
                }

                enemy.setComponent(ai);

                // if we're within 1 block of the player, EXPLODE
                const playerPos = this.world.getPlayer().getPosition();
                const enemyPos = enemy.getPosition();
                const distance = Math.sqrt(Math.pow(playerPos.x - enemyPos.x, 2) + Math.pow(playerPos.y - enemyPos.y, 2));
                
                if(distance <= 2) {
                    logger.warn("EXPLODING FOLLOW BOT");
                    this.createExplosion(enemy);
                    this.world.removeEntity(enemy.getId());
                }
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
                        const moveComponent = enemy.getComponent('move') as MoveComponent;
                        const allowDiagonal = moveComponent?.allowDiagonal || false;
                        const ignoreImpassable = moveComponent?.ignoreImpassable || false;

                        const path = this.world.findPath(enemy.getPosition(), ai.destination, ignoreImpassable, allowDiagonal);

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
                    const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;
                    const fireCooldown = cooldowns?.getCooldown('fire');

                    if (ai.turnsLocked > 4 && cooldowns && fireCooldown && fireCooldown.ready) {
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

                        if(cooldowns) {
                            cooldowns.setCooldown('fire', fireCooldown.base);
                        }

                        ai.turnsLocked = 0;
                    }
                } else {
                    ai.turnsLocked = 0;
                }

                enemy.setComponent(ai);
                break;
        }
    }

    private moveTowardsPlayer(enemy: Entity): void {
        // Get player and enemy positions
        const playerPos = this.world.getPlayer().getPosition();
        const enemyPos = enemy.getPosition();

        // Calculate direction to player
        const dx = Math.sign(playerPos.x - enemyPos.x);  // Will be -1, 0, or 1
        const dy = Math.sign(playerPos.y - enemyPos.y);  // Will be -1, 0, or 1

        // Target position is adjacent tile in direction of player
        const targetPos = {
            x: enemyPos.x + dx,
            y: enemyPos.y + dy
        };

        // Check cooldown and attempt move if ready
        const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;
        const moveCooldown = cooldowns?.getCooldown('move');

        const move = enemy.getComponent('move') as MoveComponent;
        const allowDiagonal = move?.allowDiagonal || false;
        const ignoreImpassable = move?.ignoreImpassable || false;

        if (moveCooldown?.ready && 
            // Don't try to move if we're already at target
            (targetPos.x !== enemyPos.x || targetPos.y !== enemyPos.y)) {
            
            this.actionHandler.execute({
                type: 'entityMove',
                entityId: enemy.getId(),
                data: { 
                    to: targetPos,
                }
            });
        }
    }

    private createExplosion(enemy: Entity): void {
        const enemyPos = enemy.getPosition();
        const playerPos = this.world.getPlayer().getPosition();
        
        const adjacentTiles = [
            {x: enemyPos.x - 1, y: enemyPos.y},
            {x: enemyPos.x + 1, y: enemyPos.y},
            {x: enemyPos.x, y: enemyPos.y - 1},
            {x: enemyPos.x, y: enemyPos.y + 1},
            {x: enemyPos.x, y: enemyPos.y},
            {x: enemyPos.x - 1, y: enemyPos.y - 1},
            {x: enemyPos.x + 1, y: enemyPos.y - 1},
            {x: enemyPos.x - 1, y: enemyPos.y + 1},
            {x: enemyPos.x + 1, y: enemyPos.y + 1},
        ];

        for (const tile of adjacentTiles) {
            if(tile.x === playerPos.x && tile.y === playerPos.y) {
                continue;
            }

            const entity = new Entity(tile);
            entity.setComponent(new SymbolComponent('☷', '#FFFFFFFF', '#C8BDBD88', 1000));
            entity.setComponent(new ImpassableComponent());
            entity.setComponent(new CooldownComponent({
                'disperse': {
                    base: 30,
                    current: 30,
                    ready: false
                }
            }));
            this.world.addEntity(entity);
        }
    }
} 

