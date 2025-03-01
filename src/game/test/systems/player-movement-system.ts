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
import { TurboComponent } from '../components/turbo.component';
import { directionToRadians } from '../../../util';

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
                player.removeComponent('stun');
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

    private movePlayer(player: Entity): void {
        const prediction = this.movementPredictor.predictMove(player);
        const inertia = player.getComponent('inertia') as InertiaComponent;
        const turbo = player.getComponent('turbo') as TurboComponent;
        if (prediction.willCollide) {
            if (inertia && inertia.magnitude > 1) {
                this.stunPlayer(player, inertia.magnitude);
            }
            
            return;
        }

        // decay speed beyond 6 after turbo disengages
        if(prediction.finalInertia.magnitude > 6 && !turbo) {
            prediction.finalInertia.magnitude -= 1;
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


            const cooldowns = player.getComponent('cooldown') as CooldownComponent;
            if(cooldowns) {
                if(prediction.finalInertia.magnitude >= 2) {


                    const turbo = player.getComponent('turbo') as TurboComponent;

                    const newCooldown = turbo ? 1 : 2; // then 2 and 1
                    logger.info(`Setting move cooldown to ${newCooldown} ticks`);
                    cooldowns.setCooldown('move', newCooldown, newCooldown);
                    player.setComponent(cooldowns);
                }
            }


        // Update light emitter if present
        if (player.hasComponent('lightEmitter')) {
            const lightEmitter = player.getComponent('lightEmitter') as LightEmitterComponent;
            const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;

            if(bufferedMove) {
                lightEmitter.config.facing = directionToRadians(bufferedMove.direction);
            } else {
                lightEmitter.config.facing = directionToRadians(prediction.finalInertia.direction);
            }
            player.setComponent(lightEmitter);
        }

        // Reset move cooldown with base value
        // const cooldowns = player.getComponent('cooldown') as CooldownComponent;
        // cooldowns.setCooldown('move', COOLDOWNS.PLAYER_MOVE, COOLDOWNS.PLAYER_MOVE, false);
        // player.setComponent(cooldowns);

        if(turbo) {
            turbo.turnsSinceEngaged += 1;
            player.setComponent(turbo);
        }

        // Remove the buffered move component
        player.removeComponent('bufferedMove');
    }

    stunPlayer(player: Entity, magnitude: number) {

        if (magnitude == 0) {
            return;
        }

        this.actionHandler.execute({
            type: 'stun',
            entityId: player.getId(),
            data: {
                duration: magnitude * 3,
                resetInertia: true
            }
        });
    }
} 