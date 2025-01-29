import { World } from '../../../world/world';
import { Point, Direction } from '../../../types';
import { ActionHandler } from '../../../action/action-handler';
import { CooldownComponent } from '../components/cooldown.component';
import { logger } from '../../../util/logger';
import { Entity } from '../../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { InertiaComponent } from '../components/inertia.component';
import { LightEmitterComponent } from '../../../entity/components/light-emitter-component';
import { MovementPredictor } from './movement-predictor';

export const PLAYER_MOVE_COOLDOWN = 1000;

export class PlayerMovementSystem {
    private movementPredictor: MovementPredictor;

    constructor(
        private world: World,
        private actionHandler: ActionHandler
    ) {
        this.movementPredictor = new MovementPredictor(world);
    }

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
            // logger.info(`Player ${player.getId()} moveState: ${moveState?.ready}`);
            if (moveState?.ready) {
                this.movePlayer(player);
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
        const prediction = this.movementPredictor.predictMove(player);
        // logger.info(`Player ${player.getId()} prediction: ${prediction.actions.length} actions will collide: ${prediction.willCollide} finalInertia: ${prediction.finalInertia.direction}@${prediction.finalInertia.magnitude}`);
        const inertia = player.getComponent('inertia') as InertiaComponent;

        if (prediction.willCollide) {
            if (inertia && inertia.magnitude > 1) {
                this.stunPlayer(player, inertia.magnitude);
            }
            player.setComponent(new InertiaComponent(
                inertia?.direction ?? Direction.South,
                0
            ));
            return;
        }

        // Execute all predicted moves
        for (const action of prediction.actions) {
            this.actionHandler.execute(action);
        }

        // Update inertia with predicted final state
        player.setComponent(new InertiaComponent(
            prediction.finalInertia.direction,
            prediction.finalInertia.magnitude
        ));


           

        // UPDATE COOLDOWNS
        //      this will happen when speed changes from 2 to 3
        //      and then again when turbo mode is engaged.
            // const cooldowns = player.getComponent('cooldown') as CooldownComponent;
            // if(cooldowns) {
            //     const newCooldown = 4; // then 2 and 1
            //     logger.info(`Setting move cooldown to ${newCooldown} ticks`);
            //     cooldowns.setCooldown('move', newCooldown, newCooldown);
            //     player.setComponent(cooldowns);
            // }


        // Update light emitter if present
        if (player.hasComponent('lightEmitter')) {
            const lightEmitter = player.getComponent('lightEmitter') as LightEmitterComponent;
            const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;

            if(bufferedMove) {
                lightEmitter.config.facing = this.directionToRadians(bufferedMove.direction);
            } else {
                lightEmitter.config.facing = this.directionToRadians(prediction.finalInertia.direction);
            }
            player.setComponent(lightEmitter);
        }

        // Reset move cooldown with base value
        // const cooldowns = player.getComponent('cooldown') as CooldownComponent;
        // cooldowns.setCooldown('move', COOLDOWNS.PLAYER_MOVE, COOLDOWNS.PLAYER_MOVE, false);
        // player.setComponent(cooldowns);

        // Remove the buffered move component
        player.removeComponent('bufferedMove');
    }

    stunPlayer(player: Entity, magnitude: number) {

        if (magnitude == 0) {
            return;
        }

        const stunDuration = magnitude * 3;
        const cooldowns = player.getComponent('cooldown') as CooldownComponent;
        cooldowns.setCooldown('stun', stunDuration, stunDuration, true);
        logger.info(`Player ${player.getId()} stunned for ${stunDuration}ms`);
    }

    // Convert Direction enum to radians (Direction.North = 0 = up = -PI/2)
    // consider making this a util function later
    private directionToRadians(direction: Direction): number {
        switch (direction) {
            case Direction.South: return -Math.PI / 2;  // Up
            case Direction.East: return 0;           // Right
            case Direction.North: return Math.PI / 2;   // Down
            case Direction.West: return Math.PI;      // Left
        }
    }
} 