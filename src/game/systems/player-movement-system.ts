import { World } from '../../world/world';
import { Point, Direction } from '../../types';
import { ActionHandler } from '../../action/action-handler';
import { CooldownComponent } from '../components/cooldown.component';
import { logger } from '../../util/logger';
import { Entity } from '../../entity/entity';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { InertiaComponent } from '../components/inertia.component';
import { LightEmitterComponent } from '../../entity/components/light-emitter-component';
import { MEDIUM_SPEED_THRESHOLD, MovementPredictor, BASE_MAX_SPEED } from './movement-predictor';
import { TurboComponent } from '../components/turbo.component';
import { directionToRadians } from '../../util';
import { FacingComponent } from '../../entity/components/facing-component';
import { ObjectiveComponent } from '../components/objective.component';
import { StunComponent } from '../components/stun.component';
import { FollowerComponent } from '../../entity/components/follower-component';
import { VehicleLeaderComponent } from '../components/vehicle-leader.component';
import { EnergyComponent } from '../components/energy.component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { ReverseComponent } from '../components/reverse.component';

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
        const energy = player.getComponent('energy') as EnergyComponent;
        const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;

        logger.info(`prediction.isReverseing: ${prediction.isReverseing}`);
        player.removeComponent('reverse');
        if(prediction.isReverseing) {
            player.setComponent(new ReverseComponent());
        }

        if(inertia && inertia.resetInertia) {
            inertia.resetInertia = false;
            inertia.magnitude = 1;
            player.setComponent(inertia);

            const cooldowns = player.getComponent('cooldown') as CooldownComponent;
                if (cooldowns) {
                    cooldowns.setCooldown('move', 4, 4, false);
                    player.setComponent(cooldowns);
                }
            
            player.setComponent(new InertiaComponent(
                inertia.direction,
                1,
                false
            ));

            player.removeComponent('turbo');
            
            return;
        }

        if (prediction.willCollide) {
            logger.warn('Player movement collision detected');
            const to = prediction.collision;

            if(!to) {
                return;
            }

            const entitiesAtNewPos = this.world.getEntitiesAt(to);

            const objective = entitiesAtNewPos.find(e => e.hasComponent('objective') && (e.getComponent('objective') as ObjectiveComponent)?.active === true);
            let entitiesToReset: Entity[] = [];
            if (objective) {

                const follower = entitiesAtNewPos.find(e => e.hasComponent('follower'));

                let objectiveVehicleId: number = 0;
                if(follower) {
                    const followerComponent = follower.getComponent('follower') as FollowerComponent;
                    objectiveVehicleId = followerComponent.vehicleId ?? 0;
                } else {
                    const leader = objective.getComponent('vehicle-leader') as VehicleLeaderComponent;
                    objectiveVehicleId = leader.vehicleId ?? 0;
                }

                // now add to entitiesToReset all followers with the same 
                // that means looking up vehicle-leader with that id,
                // then all followers with that vehicle id.

                const leaders = this.world.getEntitiesWithComponent('vehicle-leader')
                    .filter(e => (e.getComponent('vehicle-leader') as VehicleLeaderComponent)?.vehicleId === objectiveVehicleId);

                const followers = this.world.getEntitiesWithComponent('follower')
                    .filter(e => (e.getComponent('follower') as FollowerComponent)?.vehicleId === objectiveVehicleId);

                entitiesToReset.push(...leaders, ...followers);

                // for(const entity of entitiesToReset) {
                // //     const objectiveComponent = entity.getComponent('objective') as ObjectiveComponent;
                // //     objectiveComponent.active = !objectiveComponent.active;
                // //     entity.setComponent(objectiveComponent);
                //     entity.removeComponent('objective');
                //     entity.removeComponent('lightEmitter');

                //     const symbol = entity.getComponent('symbol') as SymbolComponent;
                //     symbol.foreground = '#aaaaaaff';
                //     entity.setComponent(symbol);
        
                // }
         
                this.world.emit('objective-complete', { objective });

                this.actionHandler.execute({
                    type: 'stun',
                    entityId: leaders[0].getId(),
                    data: {
                        duration: 24,
                        resetInertia: true
                    }
                });
            }

        if (inertia && inertia.magnitude > 1) {
                this.stunPlayer(player, inertia.magnitude);
            }
            return;
        }

        // Only decay speed if we're above BASE_MAX_SPEED and turbo is not active
        if(prediction.finalInertia.magnitude > BASE_MAX_SPEED && !turbo) {
            prediction.finalInertia.magnitude -= 1;
        }

        // Drain energy if turbo is active and force turbo disengage if energy runs out
        if (turbo && energy) {
            energy.energy = Math.max(0, energy.energy - 5);
            player.setComponent(energy);

            // Force turbo disengage if we're out of energy
            if (energy.energy <= 0) {
                logger.warn('turbo disengaged due to energy depletion');
                const cooldowns = player.getComponent('cooldown') as CooldownComponent;
                if (cooldowns) {
                    cooldowns.setCooldown('move', 2, 2);
                    player.setComponent(cooldowns);
                }

                if (prediction.finalInertia.magnitude > BASE_MAX_SPEED) {
                    prediction.finalInertia.magnitude -= 1;
                }

                player.removeComponent('turbo');

                // Execute movement AFTER removing turbo
                // Execute all predicted moves
                for (const action of prediction.actions) {
                    this.actionHandler.execute(action);
                }
                return; // Exit early after handling energy depletion
            }
        }

        // Only execute moves if we didn't handle energy depletion
        for (const action of prediction.actions) {
            this.actionHandler.execute(action);
        }

        // Update inertia with predicted final state
        const currentInertia = player.getComponent('inertia') as InertiaComponent;
        player.setComponent(new InertiaComponent(
            prediction.finalInertia.direction,
            prediction.finalInertia.magnitude,
            currentInertia?.resetInertia ?? false
        ));

        // Update facing based on buffered move or inertia
        const facingDirection = bufferedMove ? bufferedMove.direction : prediction.finalInertia.direction;
        player.setComponent(new FacingComponent(facingDirection));
        
        // UPDATE COOLDOWNS
        //      this will happen when speed changes from 2 to 3
        //      and then again when turbo mode is engaged.

        const cooldowns = player.getComponent('cooldown') as CooldownComponent;
        if(cooldowns) {
            if(prediction.finalInertia.magnitude >= MEDIUM_SPEED_THRESHOLD) {
                const turbo = player.getComponent('turbo') as TurboComponent;

                const newCooldown = turbo ? 1 : 2; // then 2 and 1
                // logger.info(`Setting move cooldown to ${newCooldown} ticks`);
                cooldowns.setCooldown('move', newCooldown, newCooldown);
                player.setComponent(cooldowns);
            }
        }

        // Update light emitter if present
        // if (player.hasComponent('lightEmitter')) {
        //     const lightEmitter = player.getComponent('lightEmitter') as LightEmitterComponent;
        //     const bufferedMove = player.getComponent('bufferedMove') as BufferedMoveComponent;

        //     if(bufferedMove) {
        //         lightEmitter.config.facing = directionToRadians(bufferedMove.direction);
        //     } else {
        //         lightEmitter.config.facing = directionToRadians(prediction.finalInertia.direction);
        //     }
        //     player.setComponent(lightEmitter);
        // }

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
                duration: magnitude > 5 ? 10 : magnitude,
                resetInertia: true
            }
        });
        
    }
} 