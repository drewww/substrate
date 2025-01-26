import { World } from '../../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { OpacityComponent } from '../../../entity/components/opacity-component';
import { ImpassableComponent } from '../../../entity/components/impassable-component';
import { logger } from '../../../util/logger';

export class ToggleSystem {
    constructor(private world: World) { }

    update(deltaTime: number): void {
        const toggleEntities = this.world.getEntities()
            .filter(e => e.hasComponent('cooldown') && e.hasComponent('symbol'));

        for (const entity of toggleEntities) {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            const toggleState = cooldowns.getCooldown('toggle');

            if (toggleState) {
                // logger.info(`entity ${entity.getId()} toggle state: ${JSON.stringify(toggleState)}`);
                if (toggleState.ready) {
                    // logger.info(`entity ${entity.getId()} toggle state: ${JSON.stringify(toggleState)}`);

                    // Reset the cooldown
                    cooldowns.setCooldown('toggle', toggleState.base, toggleState.base, false);

                    const symbol = entity.getComponent('symbol') as SymbolComponent;
                    const isRaised = entity.hasComponent('impassable')

                    if (isRaised) {
                        // Lower the tile
                        logger.info(`Lowering tile ${entity.getId()}`);
                        symbol.background = '#222222ff';
                        symbol.foreground = '#FFFFFF11';
                        entity.removeComponent('opacity');
                        entity.removeComponent('impassable');
                    } else {
                        // Raise the tile
                        logger.info(`Raising tile ${entity.getId()}`);
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
        }
    }
} 