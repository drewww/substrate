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
import { ObjectiveComponent } from '../components/objective.component';
import { Point } from '../../types';



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
                symbol.foreground = '#FFFFFFFF';        
                symbol.background = '#FF194DAA';
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
                
                // Calculate distance to player
                const helicopterPos = enemy.getPosition();
                const playerPosition = this.world.getPlayer().getPosition();
                const distanceToPlayer = Math.sqrt(
                    Math.pow(playerPosition.x - helicopterPos.x, 2) + 
                    Math.pow(playerPosition.y - helicopterPos.y, 2)
                );
                
                // Adjust cooldown based on distance
                const helicopterCooldowns = enemy.getComponent('cooldown') as CooldownComponent;
                if (helicopterCooldowns) {
                    const helicopterMoveCooldown = helicopterCooldowns.getCooldown('move');
                    if (helicopterMoveCooldown) {
                        // If more than 30 blocks away, set cooldown to 1 (very fast)
                        // Otherwise, set cooldown to 3 (normal speed)
                        const newHelicopterCooldownBase = distanceToPlayer > 30 ? 1 : 3;
                        
                        // Only update if the cooldown value has changed
                        if (helicopterMoveCooldown.base !== newHelicopterCooldownBase) {
                            helicopterCooldowns.setCooldown('move', newHelicopterCooldownBase);
                            enemy.setComponent(helicopterCooldowns);
                        }
                    }
                }

                if (canSeePlayer || playerLocked) {
                    this.moveTowardsPlayer(enemy);
                } else {
                    this.moveTowardsObjective(enemy);
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
                if (ai.distanceTraveled > 4) {
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
                        
                        // Find a new nav point, excluding current destination and requiring straight paths
                        const navPoints = this.world.getEntitiesWithComponent('pedestrian-navigation')
                            .map(point => point.getPosition())
                            .filter(point => 
                                // Different from current destination
                                (point.x !== ai.destination?.x || point.y !== ai.destination?.y) &&
                                // Must share either x or y coordinate (straight path)
                                (point.x === currentPos.x || point.y === currentPos.y)
                            );
                            
                        if(navPoints.length > 0) {
                            ai.destination = navPoints[Math.floor(Math.random() * navPoints.length)];
                        } else {
                            ai.destination = null;
                        }
                    }
                    
                    ai.lastPosition = currentPos;

                    // If we don't have a destination, pick one
                    if(!ai.destination) {
                        const navPoints = this.world.getEntitiesWithComponent('pedestrian-navigation')
                            .map(point => ({
                                point: point.getPosition(),
                                distance: Math.abs(point.getPosition().x - currentPos.x) + 
                                        Math.abs(point.getPosition().y - currentPos.y)
                            }))
                            .filter(destination => 
                                destination.distance > 0 && // don't pick current location
                                // Must share either x or y coordinate (straight path)
                                (destination.point.x === currentPos.x || 
                                 destination.point.y === currentPos.y)
                            )
                            .sort((a, b) => a.distance - b.distance)
                            .slice(0, 6)
                            .map(item => item.point);

                        if(navPoints.length > 0) {
                            ai.destination = navPoints[Math.floor(Math.random() * navPoints.length)];
                        }
                    }

                    // If we have a destination, move towards it
                    if(ai.destination) {
                        // Simple move towards destination
                        const dx = Math.sign(ai.destination.x - currentPos.x);
                        const dy = Math.sign(ai.destination.y - currentPos.y);
                        
                        const targetPos = {
                            x: currentPos.x + dx,
                            y: currentPos.y + dy
                        };

                        // Only move if we're not already at the target position
                        if(targetPos.x !== currentPos.x || targetPos.y !== currentPos.y) {
                            this.actionHandler.execute({
                                type: 'entityMove',
                                entityId: enemy.getId(),
                                data: { to: targetPos }
                            });
                        }

                        // Check if we've reached destination
                        if(currentPos.x === ai.destination.x && currentPos.y === ai.destination.y) {
                            ai.destination = null;
                        }
                    }
                }

                break;
            case EnemyAIType.EMP_TURRET:
                if (canSeePlayer) {
                    // Only increment turnsLocked if we're not already at max lock
                    if (ai.turnsLocked <= 3) {
                        ai.turnsLocked += 1;
                    }
                    
                    const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;
                    const fireCooldown = cooldowns?.getCooldown('fire');

                    if (ai.turnsLocked > 3 && cooldowns && fireCooldown && fireCooldown.ready) {
                        // compute the position of the projectile based on the player's inertia
                        const playerInertia = this.world.getPlayer().getComponent('inertia') as InertiaComponent;
                        let playerFuturePos = this.world.getPlayer().getPosition();
                        
                        if (playerInertia && playerInertia.magnitude > 0) {
                            const playerPos = this.world.getPlayer().getPosition();
                            const directionVector = directionToPoint(playerInertia.direction);
                            const MAX_DISTANCE = 8;

                            // Project 3 turns forward
                            playerFuturePos = {
                                x: Math.round(playerPos.x + (directionVector.x * 2)),
                                y: Math.round(playerPos.y + (directionVector.y * 2))
                            };

                            // Check if projected position is too far from enemy
                            const distance = Math.sqrt(
                                Math.pow(playerFuturePos.x - enemy.getPosition().x, 2) + 
                                Math.pow(playerFuturePos.y - enemy.getPosition().y, 2)
                            );

                            if (distance > MAX_DISTANCE) {
                                // Scale back to max range while maintaining direction
                                const angle = Math.atan2(
                                    playerFuturePos.y - enemy.getPosition().y,
                                    playerFuturePos.x - enemy.getPosition().x
                                );
                                
                                playerFuturePos = {
                                    x: Math.round(enemy.getPosition().x + MAX_DISTANCE * Math.cos(angle)),
                                    y: Math.round(enemy.getPosition().y + MAX_DISTANCE * Math.sin(angle))
                                };
                            }
                        }

                        this.actionHandler.execute({
                            type: 'createProjectile',
                            entityId: enemy.getId(),
                            data: {
                                position: playerFuturePos,
                                color: '#FF194DFF',
                                cooldowns: {
                                    'explode-caltrops': {
                                        base: 4,
                                        current: 4,
                                        ready: false
                                    }
                                }
                            }
                        });

                        if(cooldowns) {
                            cooldowns.setCooldown('fire', fireCooldown.base);
                        }
                        // Don't reset turnsLocked here anymore - maintain lock state
                    }
                } else {
                    // Only reset everything when we lose sight of the player
                    if (ai.turnsLocked > 0) {
                        const cooldowns = enemy.getComponent('cooldown') as CooldownComponent;
                        if (cooldowns) {
                            const fireCooldown = cooldowns.getCooldown('fire');
                            if (fireCooldown) {
                                // Reset fire cooldown to ready state
                                cooldowns.setCooldown('fire', fireCooldown.base, 0, true);
                            }
                        }
                        ai.turnsLocked = 0;  // Only reset lock when breaking line of sight
                    }
                }

                enemy.setComponent(ai);
                break;
        }
    }

    private moveTowardsPosition(enemy: Entity, targetPos: Point): void {
        // Get enemy position
        const enemyPos = enemy.getPosition();

        // Calculate direction to target
        const dx = Math.sign(targetPos.x - enemyPos.x);  // Will be -1, 0, or 1
        const dy = Math.sign(targetPos.y - enemyPos.y);  // Will be -1, 0, or 1

        // Target position is adjacent tile in direction of target
        const nextPos = {
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
            (nextPos.x !== enemyPos.x || nextPos.y !== enemyPos.y)) {
            
            this.actionHandler.execute({
                type: 'entityMove',
                entityId: enemy.getId(),
                data: { 
                    to: nextPos,
                }
            });
        }
    }

    private moveTowardsPlayer(enemy: Entity): void {
        const playerPos = this.world.getPlayer().getPosition();
        this.moveTowardsPosition(enemy, playerPos);
    }

    private moveTowardsObjective(enemy: Entity): void {
        // Find active objective
        const objectives = this.world.getEntitiesWithComponent('objective');
        const activeObjective = objectives.find(obj => {
            const objComponent = obj.getComponent('objective') as ObjectiveComponent;
            return objComponent && objComponent.active;
        });

        if (activeObjective) {
            this.moveTowardsPosition(enemy, activeObjective.getPosition());
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

            const symbol = new SymbolComponent('🝆', '#FFFFFFFF', '#C8BDBD88', 1000, false);
            symbol.scaleSymbolX = 1.1;
            symbol.scaleSymbolY = 1.1;
            symbol.offsetSymbolY = -0.2;
            
            entity.setComponent(symbol);

            entity.setComponent(new ImpassableComponent());
            entity.setComponent(new CooldownComponent({
                'disperse': {
                    base: 8,
                    current: 8,
                    ready: false
                }
            }));
            this.world.addEntity(entity);
        }
    }
} 


