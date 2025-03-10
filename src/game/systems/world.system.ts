import { World } from '../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Entity } from '../../entity/entity';
import { StatusEffect, StatusEffectComponent } from '../components/status-effect.component';
import { ActionHandler } from '../../action/action-handler';
import { EntitySpawnerComponent, SPAWNER_TYPES } from '../components/entity-spawner.component';
import { FacingComponent } from '../../entity/components/facing-component';
import { directionToPoint } from '../../util';
import { logger } from '../../util/logger';
import { FollowerComponent } from '../../entity/components/follower-component';
import { FollowableComponent } from '../../entity/components/followable-component';
import { EntityConsumerComponent } from '../components/entity-consumer.component';
import { TrafficLightComponent } from '../components/traffic-light.component';
import { TrafficControllerComponent } from '../components/traffic-controller.component';
import { ImpathableComponent } from '../../entity/components/impathable-component';
import { AOEDamageComponent } from '../components/aoe-damage.component';
import { HealthComponent } from '../../entity/components/health.component';
import { LockedComponent } from '../components/locked.component';
import { TurboComponent } from '../components/turbo.component';
import { EnergyComponent } from '../components/energy.component';
import { InertiaComponent } from '../components/inertia.component';

const MIN_VEHICLE_COOLDOWN = 15;
const MAX_VEHICLE_COOLDOWN = 50;
const MAX_FOLLOWERS = 4;
const VEHICLE_COOLDOWN = 40;

export class WorldSystem {
    constructor(private world: World, private actionHandler: ActionHandler) { }

    private createExplosion(entity: Entity, template: Entity): void {
        const pattern = [
            { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 },
            { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: -1, y: 1 },
            { x: 1, y: -1 }, { x: -1, y: -1 }
        ];

        for (const offset of pattern) {
            const pos = {
                x: entity.getPosition().x + offset.x,
                y: entity.getPosition().y + offset.y
            };

            const explosion = template.clone();
            explosion.setPosition(pos.x, pos.y);
            this.world.addEntity(explosion);
        }
    }

    tick(totalUpdates?: number): void {
        const cooldownEntities = this.world.getEntitiesWithComponent('cooldown');

        for (const entity of cooldownEntities) {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            
            // Check if this is a traffic controller
            if (entity.hasComponent('traffic-controller')) {
                const controller = entity.getComponent('traffic-controller') as TrafficControllerComponent;
                const cycleState = cooldowns.getCooldown('toggle');
                
                // Find all traffic lights with matching blockId
                const trafficLights = this.world.getEntitiesWithComponent('traffic-light')
                    .filter(light => {
                        const lightComponent = light.getComponent('traffic-light') as TrafficLightComponent;
                        return lightComponent.blockId === controller.blockId;
                    });

                // Update each light
                for (const light of trafficLights) {
                    const trafficLight = light.getComponent('traffic-light') as TrafficLightComponent;
                    const symbol = light.getComponent('symbol') as SymbolComponent;
                    
                    let newPhase = false;
                    // Check for yellow phase transition first
                    if (trafficLight.phase === 0 && cycleState && cycleState.current <= 24) {
                        // Set to yellow when grey is about to end
                        trafficLight.phase = 1;
                        newPhase = true;
                    }
                    
                    if (cycleState?.ready) {
                        // On cooldown ready, toggle between red and grey
                        trafficLight.phase = trafficLight.phase === 2 ? 0 : 2;
                        newPhase = true;
                    }

                    if(!newPhase) {
                        continue;
                    }

                    // logger.warn(`Traffic light ${light.getId()} phase: ${trafficLight.phase} (cooldown: ${cycleState.current})`);
                    
                    if (trafficLight.phase === 0) {
                        // Grey and passable
                        symbol.foreground = '#666666';
                        symbol.background = '#000D12';
                        light.removeComponent('impassable');
                        light.removeComponent('impathable');
                    } else if (trafficLight.phase === 1) {
                        // Yellow and pathable but not passable
                        symbol.foreground = '#FFD700';
                        symbol.background = '#4B3D00';
                        light.setComponent(new ImpathableComponent());
                        light.removeComponent('impassable');
                    } else {
                        // Red and impassable
                        symbol.foreground = '#FF194D';
                        symbol.background = '#590426';
                        light.setComponent(new ImpassableComponent());
                        light.removeComponent('impathable');
                    }
                    
                    light.setComponent(trafficLight);
                    light.setComponent(symbol);
                }
                
                if (cycleState?.ready) {
                    // Reset the controller's cooldown
                    cycleState.current = cycleState.base;
                    cycleState.ready = false;
                    entity.setComponent(cooldowns);
                }
            }

            // const toggleState = cooldowns.getCooldown('toggle');

            // if (toggleState) {
            //     if (toggleState.ready) {

            //         const pos = entity.getPosition();
            //         const entitiesAtPos = this.world.getEntitiesAt(pos);
            //         const hasImpassableEntity = entitiesAtPos.some(e => e !== entity && e.hasComponent('impassable'));

            //         if (hasImpassableEntity) {
            //             return;
            //         }

            //         cooldowns.setCooldown('toggle', toggleState.base, toggleState.base, false);

            //         const symbol = entity.getComponent('symbol') as SymbolComponent;
            //         const isRaised = entity.hasComponent('impassable')

            //         if (isRaised) {
            //             // Lower the tile
            //             // logger.info(`Lowering tile ${entity.getId()}`);
            //             symbol.background = '#222222ff';
            //             symbol.foreground = '#FFFFFF11';
            //             entity.removeComponent('opacity');
            //             entity.removeComponent('impassable');
            //         } else {
            //             // Raise the tile
            //             // logger.info(`Raising tile ${entity.getId()}`);
            //             symbol.background = '#222222ff';
            //             symbol.foreground = '#FFFFFFff';
            //             entity.setComponent(new OpacityComponent());
            //             entity.setComponent(new ImpassableComponent());
            //         }

            //         // Set the cooldown component after all other changes
            //         entity.setComponent(cooldowns);
            //         entity.setComponent(symbol);
            //     }
            // }

            const disperseState = cooldowns.getCooldown('disperse');
            if (disperseState) {
                if (disperseState.ready) {
                    this.world.removeEntity(entity.getId());
                }
            }


            // const explodeEmpState = cooldowns.getCooldown('explode-emp');
            // if (explodeEmpState) {
            //     if (explodeEmpState.ready) {
            //         explodeEmpState.current = explodeEmpState.base;
            //         explodeEmpState.ready = false;
            //         entity.setComponent(cooldowns);

            //         this.world.removeEntity(entity.getId());

            //         const empTemplate = new Entity({ x: 0, y: 0 });
            //         empTemplate.setComponent(new SymbolComponent('⚡︎', '#FFFFFFff', '#00ffd177', 1500));
            //         empTemplate.setComponent(new CooldownComponent({
            //             'disperse': {
            //                 base: 4,
            //                 current: 4,
            //                 ready: false
            //             }
            //         }));
            //         empTemplate.setComponent(new StatusEffectComponent(StatusEffect.EMP));

            //         this.createExplosion(entity, empTemplate);
            //     }
            // }

            const explodeCaltropsState = cooldowns.getCooldown('explode-caltrops');
            if (explodeCaltropsState) {
                if (explodeCaltropsState.ready) {
                    explodeCaltropsState.current = explodeCaltropsState.base;
                    explodeCaltropsState.ready = false;
                    entity.setComponent(cooldowns);

                    this.world.removeEntity(entity.getId());

                    const caltropsTemplate = new Entity({ x: 0, y: 0 });
                    caltropsTemplate.setComponent(new SymbolComponent('⛼', '#FEE083FF', '#00000000', 1500));
                    caltropsTemplate.setComponent(new StatusEffectComponent(StatusEffect.CALTROPS));
                    caltropsTemplate.setComponent(new CooldownComponent({
                        'disperse': {
                            base: 1000,
                            current: 1000,
                            ready: false
                        }
                    }));

                    this.createExplosion(entity, caltropsTemplate);
                }
            }

            const spawnerState = entity.getComponent('entity-spawner') as EntitySpawnerComponent;
            const spawnCooldown = cooldowns.getCooldown('spawn');
            const facing = entity.getComponent('facing') as FacingComponent;
            
            if (spawnerState && facing && spawnerState.spawnTypes.length > 0 && spawnCooldown?.ready) {
                const spawnType = spawnerState.spawnTypes[0];
                const directionPoint = directionToPoint(facing.direction);
                
                // Only proceed if the spawn type is a followable vehicle
                if (spawnType === 'vehicle-followable') {
                    // Determine vehicle length
                    const numFollowers = Math.floor(Math.random() * (MAX_FOLLOWERS + 1));
                    
                    // Spawn each part of the vehicle
                    for (let i = 0; i <= numFollowers; i++) {
                        const spawnPosition = {
                            x: entity.getPosition().x + (directionPoint.x * (numFollowers - i)),
                            y: entity.getPosition().y + (directionPoint.y * (numFollowers - i))
                        };

                        // Remove any existing followable entities at the spawn position
                        const existingEntities = this.world.getEntitiesAt(spawnPosition);
                        const followableEntities = existingEntities.filter(e => e.hasComponent('followable'));
                        for (const entity of followableEntities) {
                            // todo package in an action
                            this.world.removeEntity(entity.getId());
                        }

                        // Check if position is still blocked by any impassable non-followable entities
                        if (existingEntities.some(e => 
                            e.hasComponent('impassable') && !e.hasComponent('followable')
                        )) {
                            logger.info(`Blocked spawn at ${spawnPosition.x},${spawnPosition.y} (spawner at ${entity.getPosition().x},${entity.getPosition().y})`);
                            break;
                        }

                        // Determine if this is the leader or a follower
                        const template = i === 0 ? 
                            SPAWNER_TYPES['vehicle-followable'] : 
                            SPAWNER_TYPES['vehicle-follower'];

                        // Generate a unique ID for this entity
                        const entityId = Math.random().toString(36).substr(2, 9);

                        // Set descending follow priorities
                        // Leader gets highest priority, followers get decreasing priorities
                        const followPriority = numFollowers - i + 1;
                        if (template.components) {
                            const followableComponent = template.components.find(c => c.type === 'followable') as FollowableComponent;
                            if (followableComponent) {
                                followableComponent.followPriority = followPriority;
                            }
                        }

                        // Spawn the entity with the pre-generated ID
                        this.actionHandler.execute({
                            type: 'spawn',
                            entityId: entityId,
                            data: {
                                template,
                                position: spawnPosition,
                                facing: facing.direction,
                                id: entityId
                            }
                        });
                    }

                    // Reset cooldown
                    spawnCooldown.current = VEHICLE_COOLDOWN;
                    spawnCooldown.base = VEHICLE_COOLDOWN;
                    spawnCooldown.ready = false;
                    entity.setComponent(cooldowns);
                }
            }
        }

        // Handle AOE damage
        const aoeDamageEntities = this.world.getEntitiesWithComponent('aoe-damage');
        const player = this.world.getPlayer();
        if (!player) return;

        const playerPos = player.getPosition();
        const playerHealth = player.getComponent('health') as HealthComponent;

        // Health regeneration
        if(playerHealth && playerHealth.health >= 0) {
            if(!player.hasComponent('locked')) {
                playerHealth.health = Math.min(playerHealth.health + 1, playerHealth.maxHealth);
                player.setComponent(playerHealth);
            }
        }

        // Add energy regeneration
        const energy = player.getComponent('energy') as EnergyComponent;
        const turbo = player.getComponent('turbo') as TurboComponent;
        if (energy && !turbo) {
            energy.energy = Math.min(energy.energy + 5, energy.maxEnergy);
            player.setComponent(energy);
        }

        for (const entity of aoeDamageEntities) {
            const aoeDamage = entity.getComponent('aoe-damage') as AOEDamageComponent;
            const entityPos = entity.getPosition();

            // Check if player is within radius
            const dx = playerPos.x - entityPos.x;
            const dy = playerPos.y - entityPos.y;
            const distanceSquared = dx * dx + dy * dy;

            if (distanceSquared <= aoeDamage.radius * aoeDamage.radius) {
                playerHealth.health = Math.max(0, playerHealth.health - aoeDamage.damage);
                player.setComponent(playerHealth);

                this.world.emit('damage', {
                    entityId: entity.getId(),
                });
            }

            if(playerHealth && playerHealth.health <= 0) {
                this.world.emit('player-death', {
                    entityId: player.getId(),
                });
            }
        }

        const lockedEntities = this.world.getEntitiesWithComponent('locked');
        for (const entity of lockedEntities) {
            const locked = entity.getComponent('locked') as LockedComponent;
            if(locked) {
                if(locked.deleteNextTurn) {
                    entity.removeComponent('locked');
                } else if(locked.lastTurnLocked < (totalUpdates ?? 0)) {
                    locked.deleteNextTurn = true;
                    entity.setComponent(locked);
                }
            } 
        }



        const entityConsumerEntities = this.world.getEntitiesWithComponent('entity-consumer');
        for (const entity of entityConsumerEntities) {
            const entityConsumer = entity.getComponent('entity-consumer') as EntityConsumerComponent;
            const consumerPos = entity.getPosition();

            // Check immediate adjacent positions first
            const adjacentPositions = [
                { x: consumerPos.x + 1, y: consumerPos.y },
                { x: consumerPos.x - 1, y: consumerPos.y },
                { x: consumerPos.x, y: consumerPos.y + 1 }, 
                { x: consumerPos.x, y: consumerPos.y - 1 }
            ];

            // Find first followable entity
            let targetEntity: Entity | null = null;
            let targetVector = { x: 0, y: 0 };

            for (const pos of adjacentPositions) {
                const entities = this.world.getEntitiesAt(pos);
                const followable = entities.find(e => e.hasComponent('followable'));
                if (followable) {
                    targetEntity = followable;
                    targetVector = {
                        x: pos.x - consumerPos.x,
                        y: pos.y - consumerPos.y
                    };
                    break;
                }
            }

            if (targetEntity) {
                // Remove the first entity
                this.world.removeEntity(targetEntity.getId());

                // Now check positions along that vector at distances 2,3,4,5
                for (let distance = 2; distance <= 5; distance++) {
                    const checkPos = {
                        x: consumerPos.x + (targetVector.x * distance),
                        y: consumerPos.y + (targetVector.y * distance)
                    };

                    const entitiesAtPos = this.world.getEntitiesAt(checkPos);
                    const followableEntities = entitiesAtPos.filter(e => e.hasComponent('followable'));
                    
                    for (const followable of followableEntities) {
                        this.world.removeEntity(followable.getId());
                    }
                }
            }
        }
    }
} 