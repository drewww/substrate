import { World } from '../../../world/world';
import { Point, Direction } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { InertiaComponent } from '../components/inertia.component';
import { StunComponent } from '../components/stun.component';

export const PLAYER_MOVE_COOLDOWN = 1000;

export class PlayerMovementSystem {
    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) { }

    update(deltaTime: number): void {
        const players = this.world.getEntities()
            .filter(e => e.hasComponent('moveCooldown') && e.hasComponent('player'));

        for (const player of players) {
            const cooldown = player.getComponent('moveCooldown') as MoveCooldownComponent;
            const stun = player.getComponent('stun') as StunComponent;
            const inertia = player.getComponent('inertia') as InertiaComponent;

            logger.info(`inertia: ${inertia?.magnitude} ${inertia?.direction}`);


            if (stun && stun.cooldown > 0) {
                stun.cooldown -= deltaTime * 1000;

                if(stun.cooldown <= 0) {
                    player.removeComponent('stun');
                } else {
                    player.setComponent(stun);
                }

                return;
            }

            if (cooldown) {
                cooldown.cooldown -= deltaTime * 1000;

                if (cooldown.cooldown <= 0) {
                    this.movePlayer(player);

                    const inertia = player.getComponent('inertia') as InertiaComponent;
                    if (inertia) {

                        if (inertia.magnitude >= 8) {
                            cooldown.baseTime = 300;
                            cooldown.cooldown = 300;
                        } else {
                            const newBaseTime = PLAYER_MOVE_COOLDOWN - (inertia.magnitude > 1 ? 500 : 0);
                            cooldown.baseTime = newBaseTime;
                            cooldown.cooldown = newBaseTime;
                        }

                    } else {
                        cooldown.baseTime = PLAYER_MOVE_COOLDOWN;
                        cooldown.cooldown = PLAYER_MOVE_COOLDOWN;
                    }
                }

                player.setComponent(cooldown);
            }
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
                    // Add stun if we hit a wall at high speed
                    player.setComponent(new StunComponent(inertia.magnitude * 600, inertia.magnitude * 600)); // 2 second stun
                    player.removeComponent('inertia');
                    return;
                }

                this.actionHandler.execute({
                    type: 'playerMove',
                    entityId: player.getId(),
                    data: { to: newPos }
                });

                if (inertia.magnitude >= 1 && inertia.magnitude < 8) {
                    player.setComponent(new InertiaComponent(inertia.direction, inertia.magnitude - 1));
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
                type: 'playerMove',
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
                    const newMagnitude = inertia.magnitude - 2;
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
                            type: 'playerMove',
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
                        // TODO add a stun condition or something
                    }

                    actions.push({
                        type: 'playerMove',
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
                    player.setComponent(new StunComponent(600*inertia.magnitude, 600*inertia.magnitude));
                }
            }

            this.actionHandler.execute(action);
        }

        // Remove the buffered move component
        player.removeComponent('bufferedMove');
    }

    private isOppositeDirection(dir1: Direction, dir2: Direction): boolean {
        return (
            (dir1 === Direction.North && dir2 === Direction.South) ||
            (dir1 === Direction.South && dir2 === Direction.North) ||
            (dir1 === Direction.East && dir2 === Direction.West) ||
            (dir1 === Direction.West && dir2 === Direction.East)
        );
    }
} 