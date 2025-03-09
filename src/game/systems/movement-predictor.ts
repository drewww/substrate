import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { Point, Direction } from '../../types';
import { InertiaComponent } from '../components/inertia.component';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { logger } from '../../util/logger';
import { SLIDE_SPEED } from '../constants';
import { BrakeComponent } from '../components/brake.component';
import { TurboComponent } from '../components/turbo.component';
import { directionToPoint, isOppositeDirection } from '../../util';
import { MetricsComponent } from '../components/metrics.component';

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
    collision?: Point;
    isReverseing: boolean;
}

export const MEDIUM_SPEED_THRESHOLD = 2;
export const BASE_MAX_SPEED = 5;
export const TURBO_MAX_SPEED = 7;


export class MovementPredictor {
    constructor(private world: World) {}

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

        const maxSpeed = turbo ? TURBO_MAX_SPEED : Math.max(BASE_MAX_SPEED, inertia?.magnitude ?? BASE_MAX_SPEED);
        logger.warn(`maxSpeed: ${maxSpeed} turbo: ${turbo} inertia: ${inertia?.magnitude}`);

        logger.info(`buffered: ${bufferedMove?.direction} inertia: ${inertia?.direction} magnitude: ${inertia?.magnitude} brake: ${brake}`);


        let isReverseing = false;

        // If no buffered move and no significant inertia, no movement
        if (!bufferedMove && !brake&& (!inertia || inertia.magnitude <= 1)) {
            // logger.info(`No buffered move and no significant inertia, no movement`);
            return {
                actions: [],
                finalInertia: {
                    direction: inertia?.direction ?? Direction.South,
                    magnitude: 0
                },
                willCollide: false,
                isReverseing: false
            };
        }

        // Handle pure inertia movement (no buffered move)
        if (!bufferedMove && !brake && inertia && inertia.magnitude > 1) {
            // logger.info("No buffered move, but inertia is present and greater than 1");
            const inertiaDir = directionToPoint(inertia.direction);
            const newPos = {
                x: pos.x + inertiaDir.x,
                y: pos.y + inertiaDir.y
            };

            // hard coding here because this is player-specific logic
            if (!this.world.isPassable(pos.x, pos.y, newPos.x, newPos.y, false, false, true)) {
                // logger.info(`Inertial movement will collide`);
                return {
                    actions: [],
                    finalInertia: { direction: inertia.direction, magnitude: 0},
                    willCollide: true,
                    collision: {
                        x: newPos.x,
                        y: newPos.y
                    },
                    isReverseing: false
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
                willCollide: false,
                isReverseing: false
            };
        }

        // I can't find a cleaner way to abstract this code path given how we're handling state around.
        // this should ignore the buffered move in that code path.
        if(!bufferedMove && brake) {
            bufferedMove = new BufferedMoveComponent(Direction.None);
        }

        // Handle buffered move with potential inertia
        if (bufferedMove) {
            const dir = directionToPoint(bufferedMove.direction);
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
                    // OKAY this is where we wnat a variation. two moves in the same direction
                    // with key up after each, should not get to speed 2. so we need to pass in 
                    // a "keyup" flag on buffered move.
                    if(bufferedMove.keyUp) {
                        finalInertia.magnitude = inertia.magnitude;
                    } else {
                        finalInertia.magnitude = Math.min(maxSpeed, inertia.magnitude + 1);
                    }
                    
                } else if (isOppositeDirection(bufferedMove.direction, inertia.direction) || brake) {
                    // Opposite direction: decrease inertia and potentially slide
                    
                    actions.pop(); // Remove the buffered move
                    
                    if (inertia.magnitude >= MEDIUM_SPEED_THRESHOLD) {
                        // continue moving, but drop inertia by one
                        const inertiaDir = directionToPoint(inertia.direction);
                        actions.push({
                            type: 'entityMove',
                            entityId: player.getId(),
                            data: { to: { x: pos.x + inertiaDir.x, y: pos.y + inertiaDir.y } }
                        });

                        isReverseing = true;
                    }
                    
                    if(brake) {
                        finalInertia = {
                            direction: inertia.direction,
                            magnitude: Math.max(0, inertia.magnitude-1),
                        };

                        
                    } else {

                        // don't allow retro thrusting to drop you below 2 speed. 
                        // this will make tight turns easier.
                        finalInertia = {
                            direction: inertia.direction,
                            magnitude: Math.max(SLIDE_SPEED+1, inertia.magnitude-1),
                        };

                        isReverseing = true;
                    }
                    
                } else if(inertia.magnitude <= SLIDE_SPEED) {
                    // if inertia is less than 2, still update the direction
                    // TODO What is happening here?
                    // This case is... there is an input, it's not WITH momentum, or AGAINST momentum. 
                    finalInertia = {
                        direction: bufferedMove.direction,
                        magnitude: inertia.magnitude,
                    };
                }
                else {
                    // Perpendicular movement

                    if (inertia.magnitude > SLIDE_SPEED) {
                        const inertiaDir = directionToPoint(inertia.direction);
                        const slidePos = {
                            x: newPos.x + inertiaDir.x,
                            y: newPos.y + inertiaDir.y
                        };

                        // if (!this.world.isPassable(newPos.x, newPos.y, slidePos.x, slidePos.y, false, false, true)) {
                        //     finalInertia = {
                        //         direction: inertia.direction,
                        //         magnitude: 0,
                        //     };
                        //     slideCollision = true;
                        // } else {

                        // put the slide into the actions queue and if it's a collision catch it later.

                        // this is fucking brutal but let's keep it in for now.
                        actions.push({
                            type: 'entityMove',
                            entityId: player.getId(),
                            data: { to: slidePos }
                        });
                        // }
                    }

                    const newMagnitude = Math.max(0, inertia.magnitude - 1);
                    finalInertia = {
                        direction: newMagnitude >= SLIDE_SPEED && newMagnitude <= SLIDE_SPEED+1 ? 
                            bufferedMove.direction : inertia.direction,
                        magnitude: Math.min(maxSpeed, !turbo ? newMagnitude : newMagnitude+1),  // Cap at max speed
                    };

                // Increment tiles drifted when moving perpendicular to momentum
                if (player.hasComponent('metrics')) {
                    const metrics = player.getComponent('metrics') as MetricsComponent;
                    metrics.tilesDrifted += 1;
                    player.setComponent(metrics);
                }
                }
            }

            // Check for collisions in all planned moves
            for (const action of actions) {
                const from = action === actions[0] ? pos : actions[actions.indexOf(action) - 1].data.to;
                if (!this.world.isPassable(from.x, from.y, action.data.to.x, action.data.to.y, false, false, true)) {
                    return {
                        actions: [],
                        finalInertia: { direction: inertia?.direction ?? bufferedMove.direction, magnitude: 0},
                        willCollide: true,
                        collision: {
                            x: action.data.to.x,
                            y: action.data.to.y
                        },
                        isReverseing: isReverseing
                    };
                }
            }

            return {
                actions,
                finalInertia,
                willCollide: false,
                isReverseing: isReverseing
            };
        }

        // Shouldn't reach here, but just in case
        return {
            actions: [],
            finalInertia: {
                direction: inertia?.direction ?? Direction.South,
                magnitude: 0,
            },
            willCollide: false,
            isReverseing: false
        };
    }

    // private handleBrake(player: Entity): MovementPrediction {
    //     const inertia = player.getComponent('inertia') as InertiaComponent;
    //     const brake = player.getComponent('brake') as BrakeComponent;
        
    //     return {
    //         actions: [],
    //         finalInertia: { direction: inertia?.direction ?? Direction.South, magnitude: 0 },
    //         willCollide: false,
    //         isReverseing: false
    //     };
    // }
} 