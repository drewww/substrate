import { World } from '../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Entity } from '../../entity/entity';
import { EMPComponent } from '../components/emp.component';
import { ActionHandler } from '../../action/action-handler';
import { EntitySpawnerComponent, SPAWNER_TYPES } from '../components/entity-spawner.component';
import { FacingComponent } from '../../entity/components/facing-component';
import { directionToPoint } from '../../util';
import { logger } from '../../util/logger';
import { FollowerComponent } from '../../entity/components/follower-component';
import { FollowableComponent } from '../../entity/components/followable-component';
import { EntityConsumerComponent } from '../components/entity-consumer.component';

const MIN_VEHICLE_COOLDOWN = 15;
const MAX_VEHICLE_COOLDOWN = 50;
const MAX_FOLLOWERS = 4;
const VEHICLE_COOLDOWN = 40;

export class WorldSystem {
    constructor(private world: World, private actionHandler: ActionHandler) { }

    tick(): void {
        const cooldownEntities = this.world.getEntitiesWithComponent('cooldown').filter(e => e.hasComponent('symbol'));

        for (const entity of cooldownEntities) {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            const toggleState = cooldowns.getCooldown('toggle');

            if (toggleState) {
                if (toggleState.ready) {

                    const pos = entity.getPosition();
                    const entitiesAtPos = this.world.getEntitiesAt(pos);
                    const hasImpassableEntity = entitiesAtPos.some(e => e !== entity && e.hasComponent('impassable'));

                    if (hasImpassableEntity) {
                        return;
                    }

                    cooldowns.setCooldown('toggle', toggleState.base, toggleState.base, false);

                    const symbol = entity.getComponent('symbol') as SymbolComponent;
                    const isRaised = entity.hasComponent('impassable')

                    if (isRaised) {
                        // Lower the tile
                        // logger.info(`Lowering tile ${entity.getId()}`);
                        symbol.background = '#222222ff';
                        symbol.foreground = '#FFFFFF11';
                        entity.removeComponent('opacity');
                        entity.removeComponent('impassable');
                    } else {
                        // Raise the tile
                        // logger.info(`Raising tile ${entity.getId()}`);
                        symbol.background = '#222222ff';
                        symbol.foreground = '#FFFFFFff';
                        entity.setComponent(new OpacityComponent());
                        entity.setComponent(new ImpassableComponent());
                    }

                    // Set the cooldown component after all other changes
                    entity.setComponent(cooldowns);
                    entity.setComponent(symbol);
                }
            }

            const disperseState = cooldowns.getCooldown('disperse');
            if (disperseState) {
                if (disperseState.ready) {
                    this.world.removeEntity(entity.getId());
                }
            }

            const empState = entity.getComponent('emp') as EMPComponent;
            if (empState) {
                // apply EMP effect
                const entitiesAtPos = this.world.getEntitiesAt(entity.getPosition());
                for (const entity of entitiesAtPos) {
                    if (entity.hasComponent('player')) {
                        this.actionHandler.execute({
                            type: 'stun',
                            entityId: entity.getId(),
                            data: {
                                duration: 10,
                                resetInertia: true
                            }
                        });
                    }
                }
            }

            const explodeEmpState = cooldowns.getCooldown('explode-emp');
            if (explodeEmpState) {
                if (explodeEmpState.ready) {
                    explodeEmpState.current = explodeEmpState.base;
                    explodeEmpState.ready = false;
                    entity.setComponent(cooldowns);

                    this.world.removeEntity(entity.getId());

                    // now make an EMP explosion entity on everyt adjacent tile
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

                        const emp = new Entity(pos);
                        emp.setComponent(new SymbolComponent('⚡︎', '#FFFFFFff', '#00ffd177', 1500));
                        emp.setComponent(new CooldownComponent({
                            'disperse': {
                                base: 8,
                                current: 8,
                                ready: false
                            }
                        }));

                        emp.setComponent(new EMPComponent());
                        this.world.addEntity(emp);
                    }
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

        const entityConsumerEntities = this.world.getEntitiesWithComponent('entity-consumer');
        for (const entity of entityConsumerEntities) {
            const entityConsumer = entity.getComponent('entity-consumer') as EntityConsumerComponent;
            const visited = new Set<string>();
            const toProcess = [{entity: entity, distance: 0}];

            while (toProcess.length > 0) {
                const current = toProcess.shift()!;
                
                if (current.distance > 5) continue;
                
                const adjacentPositions = [
                    { x: current.entity.getPosition().x + 1, y: current.entity.getPosition().y },
                    { x: current.entity.getPosition().x - 1, y: current.entity.getPosition().y }, 
                    { x: current.entity.getPosition().x, y: current.entity.getPosition().y + 1 },
                    { x: current.entity.getPosition().x, y: current.entity.getPosition().y - 1 }
                ];

                let adjacentEntities: Entity[] = [];
                for (const pos of adjacentPositions) {
                    adjacentEntities = adjacentEntities.concat(this.world.getEntitiesAt(pos));
                }

                const followableEntities = adjacentEntities.filter(e => 
                    e.hasComponent('followable') && !visited.has(e.getId())
                );

                for (const followable of followableEntities) {
                    visited.add(followable.getId());
                    // todo package in an action
                    this.world.removeEntity(followable.getId());
                    toProcess.push({entity: followable, distance: current.distance + 1});
                }
            }
        }
    }
} 