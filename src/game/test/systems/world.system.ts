import { World } from '../../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { OpacityComponent } from '../../../entity/components/opacity-component';
import { ImpassableComponent } from '../../../entity/components/impassable-component';
import { Entity } from '../../../entity/entity';
import { EMPComponent } from '../components/emp.component';
import { ActionHandler } from '../../../action/action-handler';

export class WorldSystem {
    constructor(private world: World, private actionHandler: ActionHandler) { }

    tick(): void {
        const toggleEntities = this.world.getEntities()
            .filter(e => e.hasComponent('cooldown') && e.hasComponent('symbol'));

        for (const entity of toggleEntities) {
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
            if(disperseState) {
                if(disperseState.ready) {
                    this.world.removeEntity(entity.getId());
                }
            }

            const empState = entity.getComponent('emp') as EMPComponent;
            if(empState) {
                // apply EMP effect
                const entitiesAtPos = this.world.getEntitiesAt(entity.getPosition());
                for(const entity of entitiesAtPos) {
                    if(entity.hasComponent('player')) {
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
            if(explodeEmpState) {
                if(explodeEmpState.ready) {
                    explodeEmpState.current = explodeEmpState.base;
                    explodeEmpState.ready = false;
                    entity.setComponent(cooldowns);

                    this.world.removeEntity(entity.getId());

                    // now make an EMP explosion entity on everyt adjacent tile
                    const pattern = [
                        {x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 0},
                        {x: 0, y: 1}, {x: 0, y: -1},
                        {x: 1, y: 1}, {x: -1, y: 1},
                        {x: 1, y: -1}, {x: -1, y: -1}
                    ];

                    for(const offset of pattern) {
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
        }
    }
} 