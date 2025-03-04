import { World } from '../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Entity } from '../../entity/entity';
import { EMPComponent } from '../components/emp.component';
import { ActionHandler } from '../../action/action-handler';
import { EntitySpawnerComponent } from '../components/entity-spawner.component';
import { FacingComponent } from '../../entity/components/facing-component';
import { directionToPoint } from '../../util';
import { logger } from '../../util/logger';

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
            if (spawnerState) {
                if (spawnerState.spawnTypes.length > 0 && spawnCooldown && spawnCooldown.ready) {
                    // TODO Package this in an action
                    const spawnType = spawnerState.spawnTypes[0];

                    const facing = entity.getComponent('facing') as FacingComponent;
                    const directionPoint = directionToPoint(facing.direction);
                    const spawnPosition = {
                        x: entity.getPosition().x + directionPoint.x,
                        y: entity.getPosition().y + directionPoint.y
                    };

                    logger.warn("TRYING TO SPAWN AN ENTITY: ", spawnPosition);

                    const spawner = new Entity(spawnPosition);
                    spawner.setComponent(new SymbolComponent('?', '#FFFFFFFF', '#5335FFFF', 1500));
                    this.world.addEntity(spawner);
                }
            }
        }
    }
} 