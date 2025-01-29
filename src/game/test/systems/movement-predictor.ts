import { World } from '../../../world/world';
import { Entity } from '../../../entity/entity';
import { Point, Direction } from '../../../types';
import { InertiaComponent } from '../components/inertia.component';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { logger } from '../../../util/logger';
import { SLIDE_SPEED } from '../constants';
import { BrakeComponent } from '../components/brake.component';
import { TurboComponent } from '../components/turbo.component';

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
        const brake = player.getComponent('brake') as BrakeComponent;
        const pos = player.getPosition();
        
        // Calculate max speed based on current gear
        // const maxSpeed:number = GEAR_SPEEDS[gear.gear];

        // TODO: set this to 8 or 10 when turbo engaged.

        const turbo = player.getComponent('turbo') as TurboComponent;

        const maxSpeed = turbo ? 10 : Math.max(6, inertia?.magnitude ?? 6);

        // if(gear.queuedShift==-1) {

        //     const oppositeDirection = {
        //         [Direction.North]: Direction.South,
        //         [Direction.South]: Direction.North,
        //         [Direction.West]: Direction.East,
        //         [Direction.East]: Direction.West
        //     }[inertia.direction];

        //     // let newBufferedMove: BufferedMoveComponent | null = null;
        //     // if(!bufferedMove) {
        //     //     if(inertia.magnitude > 1) {
        //     //         bufferedMove = new BufferedMoveComponent(oppositeDirection);
        //     //     }
        //     // } else {
        //     //     bufferedMove.direction = oppositeDirection;
        //     // }

        // }

        logger.info(`buffered: ${bufferedMove?.direction} inertia: ${inertia?.direction} magnitude: ${inertia?.magnitude} brake: ${brake}`);

        // If no buffered move and no significant inertia, no movement
        if (!bufferedMove && !brake&& (!inertia || inertia.magnitude <= 1)) {
            // logger.info(`No buffered move and no significant inertia, no movement`);
            return {
                actions: [],
                finalInertia: {
                    direction: inertia?.direction ?? Direction.South,
                    magnitude: 0
                },
                willCollide: false
            };
        }

        // Handle pure inertia movement (no buffered move)
        if (!bufferedMove && !brake && inertia && inertia.magnitude > 1) {
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
                    finalInertia: { direction: inertia.direction, magnitude: 0},
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
                    magnitude: Math.min(maxSpeed, inertia.magnitude+1),  // Cap at max speed. in this model, speed up even if you're not pushing forward.
                },
                willCollide: false
            };
        }

        // I can't find a cleaner way to abstract this code path given how we're handling state around.
        // this should ignore the buffered move in that code path.
        if(!bufferedMove && brake) {
            bufferedMove = new BufferedMoveComponent(Direction.North);
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
            };

            if (inertia) {

                if(inertia.magnitude === 0) {
                    inertia.direction = bufferedMove.direction;
                }

                if (inertia.direction === bufferedMove.direction) {
                    // Same direction: increase inertia, but cap at maxSpeed
                    finalInertia.magnitude = Math.min(maxSpeed, inertia.magnitude + 1);
                } else if (this.isOppositeDirection(bufferedMove.direction, inertia.direction) || brake) {
                    // Opposite direction: decrease inertia and potentially slide
                    
                    actions.pop(); // Remove the buffered move
                    
                    if (inertia.magnitude >= 2) {
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
                        magnitude: Math.max(0, inertia.magnitude-1),
                    };
                } else if(inertia.magnitude <= SLIDE_SPEED) {
                    // if inertia is less than 2, still update the direction
                    // TODO What is happening here? This case is... there is an input, it's not WITH momentum, or AGAINST momentum. 
                    finalInertia = {
                        direction: bufferedMove.direction,
                        magnitude: inertia.magnitude,
                    };
                }
                else {
                    // Perpendicular movement
                    if (inertia.magnitude > SLIDE_SPEED) {
                        const inertiaDir = this.directionToPoint(inertia.direction);
                        const slidePos = {
                            x: newPos.x + inertiaDir.x,
                            y: newPos.y + inertiaDir.y
                        };

                        if (!this.world.isPassable(newPos.x, newPos.y, slidePos.x, slidePos.y)) {
                            finalInertia = {
                                direction: inertia.direction,
                                magnitude: 0,
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
                        direction: newMagnitude >= SLIDE_SPEED && newMagnitude <= SLIDE_SPEED+1 ? 
                            bufferedMove.direction : inertia.direction,
                        magnitude: Math.min(maxSpeed, !turbo ? newMagnitude : newMagnitude+1),  // Cap at max speed
                    };
                }
            }

            // Check for collisions in all planned moves
            for (const action of actions) {
                const from = action === actions[0] ? pos : actions[actions.indexOf(action) - 1].data.to;
                if (!this.world.isPassable(from.x, from.y, action.data.to.x, action.data.to.y)) {
                    return {
                        actions: [],
                        finalInertia: { direction: inertia?.direction ?? bufferedMove.direction, magnitude: 0},
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
            },
            willCollide: false
        };
    }

    private handleBrake(player: Entity): MovementPrediction {
        const inertia = player.getComponent('inertia') as InertiaComponent;
        const brake = player.getComponent('brake') as BrakeComponent;
        
        return {
            actions: [],
            finalInertia: { direction: inertia?.direction ?? Direction.South, magnitude: 0 },
            willCollide: false
        };
    }
} 