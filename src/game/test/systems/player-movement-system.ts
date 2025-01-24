import { World } from '../../../world/world';
import { Point, Direction } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { InertiaComponent } from '../components/inertia.component';

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

    private directionToPoint(direction: Direction): Point {
        switch (direction) {
            case Direction.North: return { x: 0, y: -1 };
            case Direction.South: return { x: 0, y: 1 };
            case Direction.West:  return { x: -1, y: 0 };
            case Direction.East:  return { x: 1, y: 0 };
        }
    }

    private movePlayer(player: Entity): void {
        const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;
        const pos = player.getPosition();

        if (!bufferedMove) {
            if(player.hasComponent('inertia')) {
                // slide in the direction of the inertia and decrement the inertia
                const inertia = player.getComponent('inertia') as InertiaComponent;

                if(inertia.magnitude <= 0) {
                    player.removeComponent('inertia');
                    return;
                }

                const inertiaDir = this.directionToPoint(inertia.direction);
                const newPos: Point = {
                    x: pos.x + inertiaDir.x,
                    y: pos.y + inertiaDir.y
                };

                this.actionHandler.execute({
                    type: 'playerMove',
                    entityId: player.getId(),
                    data: { to: newPos }
                });

                if(inertia.magnitude >= 1) {
                    player.setComponent(new InertiaComponent(inertia.direction, inertia.magnitude - 1));
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
            if (inertia.direction === bufferedMove.direction) {
                // Same direction: increase inertia (max 4)
                player.setComponent(new InertiaComponent(inertia.direction, Math.min(4, inertia.magnitude + 1)));

                // TODO change cooldowns

            } else if (this.isOppositeDirection(bufferedMove.direction, inertia.direction)) {
                // Opposite direction: decrease inertia and stay still
                if (inertia.magnitude > 0) {
                    const newMagnitude = inertia.magnitude - 1;
                    if (newMagnitude === 0) {
                        player.removeComponent('inertia');
                    } else {
                        player.setComponent(new InertiaComponent(inertia.direction, newMagnitude));
                    }

                    // remove the queued move action
                    actions.pop();
                }
            } else {
                // Perpendicular movement: slide in direction of inertia
                const inertiaDir = this.directionToPoint(inertia.direction);
                for (let i = 0; i < inertia.magnitude; i++) {
                    const slidePos = {
                        x: newPos.x + inertiaDir.x,
                        y: newPos.y + inertiaDir.y
                    };

                    // Check if we can move there
                    if (!this.world.isPassable(newPos.x, newPos.y, slidePos.x, slidePos.y)) {
                        player.removeComponent('inertia');

                        // TODO add a stun condition or something

                        break;
                    }

                    actions.push({
                        type: 'playerMove',
                        entityId: player.getId(),
                        data: { to: slidePos }
                    });

                    logger.info(`Player ${player.getId()} slid to ${slidePos.x}, ${slidePos.y}`);

                    // newPos.x = slidePos.x;
                    // newPos.y = slidePos.y;
                }
                // Decrease inertia by 1 after slide
                const newMagnitude = inertia.magnitude - 1;
                if (newMagnitude === 0) {
                    player.removeComponent('inertia');
                } else {
                    player.setComponent(new InertiaComponent(inertia.direction, newMagnitude));
                }
            }
        } else {
            // No existing inertia: create new inertia component
            player.setComponent(new InertiaComponent(bufferedMove.direction, 1));
        }

        for (const action of actions) {
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