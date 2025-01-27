import { World } from '../../../world/world';
import { Point, Direction } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { CooldownComponent } from '../components/cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { InertiaComponent } from '../components/inertia.component';
import { LightEmitterComponent } from '../../../entity/components/light-emitter-component';
import { COOLDOWNS } from '../constants';

export const PLAYER_MOVE_COOLDOWN = 1000;

export class PlayerMovementSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) { }

    tick(): void {
        const players = this.world.getEntitiesWithComponent('cooldown')
            .filter(e => e.hasComponent('player'));

        for (const player of players) {
            const cooldowns = player.getComponent('cooldown') as CooldownComponent;
            const inertia = player.getComponent('inertia') as InertiaComponent;

            // Check stun first
            const stunState = cooldowns.getCooldown('stun');
            if (stunState && !stunState.ready) {
                return;
            } else if (stunState && stunState.ready) {
                // cooldowns.setCooldown('stun', stunState.base, stunState.current, false);
                cooldowns.removeCooldown('stun');
            }

            // Check move cooldown
            const moveState = cooldowns.getCooldown('move');
            if (moveState?.ready) {
                this.movePlayer(player);

                // Reset move cooldown based on inertia
                if (inertia) {
                    if (inertia.magnitude >= 8) {
                        cooldowns.setCooldown('move', COOLDOWNS.FAST_MOVE);
                    } else {
                        const newBaseTime = COOLDOWNS.PLAYER_MOVE - (inertia.magnitude > 1 ? COOLDOWNS.MEDIUM_MOVE : 0);
                        cooldowns.setCooldown('move', newBaseTime);
                    }
                } else {
                    cooldowns.setCooldown('move', COOLDOWNS.PLAYER_MOVE);
                }
            }

            player.setComponent(cooldowns);
        }
    }

    private directionToPoint(direction: Direction): Point {
        switch (direction) {
            case Direction.North: return { x: 0, y: -1 };
            case Direction.South: return { x: 0, y: 1 };
            case Direction.West: return { x: -1, y: 0 };
            case Direction.East: return { x: 1, y: 0 };
        }
    }

    private movePlayer(player: Entity): void {
        const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;
        const pos = player.getPosition();

        if (!bufferedMove) {
            if (player.hasComponent('inertia')) {
                // slide in the direction of the inertia and decrement the inertia
                const inertia = player.getComponent('inertia') as InertiaComponent;

                if (inertia.magnitude <= 1) {
                    player.removeComponent('inertia');
                    return;
                }

                const inertiaDir = this.directionToPoint(inertia.direction);
                const newPos: Point = {
                    x: pos.x + inertiaDir.x,
                    y: pos.y + inertiaDir.y
                };

                // Check if we can move there
                if (!this.world.isPassable(pos.x, pos.y, newPos.x, newPos.y)) {
                    player.removeComponent('inertia');
                    if (inertia) {
                        this.stunPlayer(player, inertia.magnitude);
                    }
                    return;
                }

                this.actionHandler.execute({
                    type: 'entityMove',
                    entityId: player.getId(),
                    data: { to: newPos }
                });

                if (inertia.magnitude >= 1 && inertia.magnitude < 8) {
                    // player.setComponent(new InertiaComponent(inertia.direction, inertia.magnitude - 1));
                } else if (inertia.magnitude == 8) {
                    // do nothing, autopilot
                } else {
                    player.removeComponent('inertia');
                }
            }

            return;
        };

        const dir = this.directionToPoint(bufferedMove.direction);
        const newPos: Point = {
            x: pos.x + dir.x,
            y: pos.y + dir.y
        };

        const actions = [
            {
                type: 'entityMove',
                entityId: player.getId(),
                data: { to: newPos }
            }
        ]

        

        // Handle inertia after the move
        const inertia = player.getComponent('inertia') as InertiaComponent;

        if (inertia) {
            const inertiaDir = this.directionToPoint(inertia.direction);

            if (inertia.direction === bufferedMove.direction) {
                // Same direction: increase inertia (max 4)
                player.setComponent(new InertiaComponent(inertia.direction, Math.min(8, inertia.magnitude + 1)));
            } else if (this.isOppositeDirection(bufferedMove.direction, inertia.direction)) {
                // Opposite direction: decrease inertia and stay still
                if (inertia.magnitude > 0) {
                    const newMagnitude = inertia.magnitude - 1;
                    if (newMagnitude <= 0) {
                        player.removeComponent('inertia');
                    } else {
                        player.setComponent(new InertiaComponent(inertia.direction, newMagnitude));
                    }

                    // remove the queued move action
                    actions.pop();

                    if(inertia.magnitude > 2) {
                        // add a slide if there's enough inertia, but it's much faster to stop than just not moving.
                        actions.push({
                            type: 'entityMove',
                            entityId: player.getId(),
                            data: { to: {x: pos.x + inertiaDir.x, y: pos.y + inertiaDir.y} }
                        });

                        // TODO add "sliding" component to trigger the trail effect
                    }
                }
            } else {
                // Perpendicular movement: slide in direction of inertia

                if (inertia.magnitude >= 2) {

                    const slidePos = {
                        x: newPos.x + inertiaDir.x,
                        y: newPos.y + inertiaDir.y
                    };

                    // Check if we can move there
                    if (!this.world.isPassable(newPos.x, newPos.y, slidePos.x, slidePos.y)) {
                        player.removeComponent('inertia');

                        logger.info(`Player ${player.getId()} slid to ${slidePos.x}, ${slidePos.y} but it is not passable`);
                        
                    }

                    actions.push({
                        type: 'entityMove',
                        entityId: player.getId(),
                        data: { to: slidePos }
                    });

                    logger.info(`Player ${player.getId()} slid to ${slidePos.x}, ${slidePos.y}`);
                }
                // newPos.x = slidePos.x;
                // newPos.y = slidePos.y;
                // }
                // Decrease inertia by 1 after slide
                const newMagnitude = inertia.magnitude - 1;
                if (newMagnitude <= 0) {
                    player.removeComponent('inertia');
                } else {

                    if (newMagnitude >= 2 && newMagnitude <= 3) {
                        player.setComponent(new InertiaComponent(bufferedMove.direction, newMagnitude));
                    } else {
                        player.setComponent(new InertiaComponent(inertia.direction, newMagnitude));
                    }

                    // TODO add "sliding" component to trigger the trail effect

                }
            }
        } else {
            // No existing inertia: create new inertia component
            player.setComponent(new InertiaComponent(bufferedMove.direction, 0));
        }

        // Execute all queued moves first
        for (const action of actions) {

            // check if the space trying to move into is passable
            if(!this.world.isPassable(player.getPosition().x, player.getPosition().y, action.data.to.x, action.data.to.y)) {
                player.removeComponent('inertia');

                if(inertia) {
                // consider non-linear. I want a speed 8 crash to HURT.
                    player.setComponent(new InertiaComponent(inertia.direction, 0));
                    this.stunPlayer(player, inertia.magnitude);
                }
            }

            this.actionHandler.execute(action);
        }

        if(player.hasComponent('lightEmitter')) {
            const lightEmitter = player.getComponent('lightEmitter') as LightEmitterComponent;
            const inertia = player.getComponent('inertia') as InertiaComponent;
            
            // Use inertia direction if it exists, otherwise use buffered move direction
            const facingDirection = inertia ? inertia.direction : bufferedMove.direction;
            
            logger.info(`Player ${player.getId()} has lightEmitter, updating facing to ${facingDirection}`);
            lightEmitter.config.facing = this.directionToRadians(facingDirection);
            
            player.setComponent(lightEmitter);
        }

        // Remove the buffered move component
        player.removeComponent('bufferedMove');
    }

    stunPlayer(player: Entity, magnitude: number) {

        if(magnitude == 0) {
            return;
        }

        const stunDuration = 600 * magnitude;
        const cooldowns = player.getComponent('cooldown') as CooldownComponent;
        cooldowns.setCooldown('stun', stunDuration);
        logger.info(`Player ${player.getId()} stunned for ${stunDuration}ms`);
    }

    private isOppositeDirection(dir1: Direction, dir2: Direction): boolean {
        return (
            (dir1 === Direction.North && dir2 === Direction.South) ||
            (dir1 === Direction.South && dir2 === Direction.North) ||
            (dir1 === Direction.East && dir2 === Direction.West) ||
            (dir1 === Direction.West && dir2 === Direction.East)
        );
    }

    // Convert Direction enum to radians (Direction.North = 0 = up = -PI/2)
    // consider making this a util function later
    private directionToRadians(direction: Direction): number {
        switch (direction) {
            case Direction.South: return -Math.PI/2;  // Up
            case Direction.East: return 0;           // Right
            case Direction.North: return Math.PI/2;   // Down
            case Direction.West: return Math.PI;      // Left
        }
    }
} 