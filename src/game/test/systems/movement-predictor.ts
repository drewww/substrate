import { World } from '../../../world/world';
import { Entity } from '../../../entity/entity';
import { Point, Direction } from '../../../types';
import { InertiaComponent } from '../components/inertia.component';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { logger } from '../../../util/logger';
import { GearComponent } from '../components/gear.component';

export interface PredictedAction {
    type: 'entityMove';
    entityId: string;
    data: { to: Point };
}

export interface MovementPrediction {
    actions: PredictedAction[];
    finalInertia: {
        direction: Direction;
        magnitude: number;
        brake: boolean;
    };
    willCollide: boolean;
}

export class MovementPredictor {
    constructor(private world: World) {}

    private directionToPoint(direction: Direction): Point {
        switch (direction) {
            case Direction.North: return { x: 0, y: -1 };
            case Direction.South: return { x: 0, y: 1 };
            case Direction.West: return { x: -1, y: 0 };
            case Direction.East: return { x: 1, y: 0 };
        }
    }

    private isOppositeDirection(dir1: Direction, dir2: Direction): boolean {
        return (
            (dir1 === Direction.North && dir2 === Direction.South) ||
            (dir1 === Direction.South && dir2 === Direction.North) ||
            (dir1 === Direction.East && dir2 === Direction.West) ||
            (dir1 === Direction.West && dir2 === Direction.East)
        );
    }

    predictMove(player: Entity): MovementPrediction {
        const actions: PredictedAction[] = [];
        let bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;
        const inertia = player.getComponent('inertia') as InertiaComponent;
        const gear = player.getComponent('gear') as GearComponent;
        const pos = player.getPosition();
        
        // Calculate max speed based on current gear
        const maxSpeed = gear ? (gear.gear * 2) - 2 : 1;

        if(gear.queuedShift==-1) {

            const oppositeDirection = {
                [Direction.North]: Direction.South,
                [Direction.South]: Direction.North,
                [Direction.West]: Direction.East,
                [Direction.East]: Direction.West
            }[inertia.direction];

            // let newBufferedMove: BufferedMoveComponent | null = null;
            // if(!bufferedMove) {
            //     if(inertia.magnitude > 1) {
            //         bufferedMove = new BufferedMoveComponent(oppositeDirection);
            //     }
            // } else {
            //     bufferedMove.direction = oppositeDirection;
            // }

        }

        logger.info(`buffered: ${bufferedMove?.direction} inertia: ${inertia?.direction} magnitude: ${inertia?.magnitude}`);

        // If no buffered move and no significant inertia, no movement
        if (!bufferedMove && (!inertia || inertia.magnitude <= 1)) {
            // logger.info(`No buffered move and no significant inertia, no movement`);
            return {
                actions: [],
                finalInertia: {
                    direction: inertia?.direction ?? Direction.South,
                    magnitude: 0,
                    brake: false
                },
                willCollide: false
            };
        }

        // Handle pure inertia movement (no buffered move)
        if (!bufferedMove && inertia && inertia.magnitude > 1) {
            // logger.info("No buffered move, but inertia is present and greater than 1");
            const inertiaDir = this.directionToPoint(inertia.direction);
            const newPos = {
                x: pos.x + inertiaDir.x,
                y: pos.y + inertiaDir.y
            };

            if (!this.world.isPassable(pos.x, pos.y, newPos.x, newPos.y)) {
                // logger.info(`Inertial movement will collide`);
                return {
                    actions: [],
                    finalInertia: { direction: inertia.direction, magnitude: 0, brake: false },
                    willCollide: true
                };
            }

            // logger.info(`Inertial movement will not collide, maintaining inertia moving in interia direction`);
            return {
                actions: [{
                    type: 'entityMove',
                    entityId: player.getId(),
                    data: { to: newPos }
                }],
                finalInertia: {
                    direction: inertia.direction,
                    magnitude: Math.min(maxSpeed, inertia.magnitude),  // Cap at max speed
                    brake: false
                },
                willCollide: false
            };
        }

        // Handle buffered move with potential inertia
        if (bufferedMove) {
            const dir = this.directionToPoint(bufferedMove.direction);
            const newPos: Point = {
                x: pos.x + dir.x,
                y: pos.y + dir.y
            };

            actions.push({
                type: 'entityMove',
                entityId: player.getId(),
                data: { to: newPos }
            });

            let finalInertia = {
                direction: bufferedMove.direction,
                magnitude: 1,
                brake: false
            };

            if (inertia) {

                if(inertia.magnitude === 0) {
                    inertia.direction = bufferedMove.direction;
                }

                if (inertia.direction === bufferedMove.direction) {
                    // Same direction: increase inertia, but cap at maxSpeed
                    finalInertia.magnitude = Math.min(maxSpeed, inertia.magnitude + 1);
                } else if (this.isOppositeDirection(bufferedMove.direction, inertia.direction)) {
                    // Opposite direction: decrease inertia and potentially slide
                    actions.pop(); // Remove the buffered move
                    
                    if (inertia.magnitude > 2) {
                        // continue moving, but drop inertia by one
                        const inertiaDir = this.directionToPoint(inertia.direction);
                        actions.push({
                            type: 'entityMove',
                            entityId: player.getId(),
                            data: { to: { x: pos.x + inertiaDir.x, y: pos.y + inertiaDir.y } }
                        });
                    }
                    
                    finalInertia = {
                        direction: inertia.direction,
                        magnitude: Math.max(0, inertia.magnitude - 1),
                        brake: true
                    };
                } else if(inertia.magnitude < 2) {
                    // if inertia is less than 2, still update the direction
                    finalInertia = {
                        direction: bufferedMove.direction,
                        magnitude: 1,
                        brake: false
                    };
                }
                else {
                    // Perpendicular movement
                    if (inertia.magnitude >= 2) {
                        const inertiaDir = this.directionToPoint(inertia.direction);
                        const slidePos = {
                            x: newPos.x + inertiaDir.x,
                            y: newPos.y + inertiaDir.y
                        };

                        if (!this.world.isPassable(newPos.x, newPos.y, slidePos.x, slidePos.y)) {
                            finalInertia = {
                                direction: inertia.direction,
                                magnitude: 0,
                                brake: false
                            };
                        } else {
                            actions.push({
                                type: 'entityMove',
                                entityId: player.getId(),
                                data: { to: slidePos }
                            });
                        }
                    }

                    const newMagnitude = Math.max(0, inertia.magnitude - 1);
                    finalInertia = {
                        direction: newMagnitude >= 2 && newMagnitude <= 3 ? 
                            bufferedMove.direction : inertia.direction,
                        magnitude: Math.min(maxSpeed, newMagnitude),  // Cap at max speed
                        brake: false
                    };
                }
            }

            // Check for collisions in all planned moves
            for (const action of actions) {
                const from = action === actions[0] ? pos : actions[actions.indexOf(action) - 1].data.to;
                if (!this.world.isPassable(from.x, from.y, action.data.to.x, action.data.to.y)) {
                    return {
                        actions: [],
                        finalInertia: { direction: inertia?.direction ?? bufferedMove.direction, magnitude: 0, brake: false },
                        willCollide: true
                    };
                }
            }

            return {
                actions,
                finalInertia,
                willCollide: false,
            };
        }

        // Shouldn't reach here, but just in case
        return {
            actions: [],
            finalInertia: {
                direction: inertia?.direction ?? Direction.South,
                magnitude: 0,
                brake: false
            },
            willCollide: false
        };
    }
} 