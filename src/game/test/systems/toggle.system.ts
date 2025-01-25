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
                logger.info(`Toggle state: ${JSON.stringify(toggleState)}`);

                if (toggleState?.ready) {

                    // Reset the cooldown first
                    cooldowns.setCooldown('toggle', toggleState.base, toggleState.base, false);
                    entity.setComponent(cooldowns);

                    // cooldowns.setCooldown('toggle', toggleState.base);

                    const symbol = entity.getComponent('symbol') as SymbolComponent;
                    const isRaised = symbol.foreground === '#FFFFFFff'

                    logger.info(`Is raised: ${isRaised}`);

                    if (isRaised) {
                        // Lower the tile
                        symbol.background = '#222222ff';
                        symbol.foreground = '#FFFFFF11';
                        entity.removeComponent('opacity');
                        entity.removeComponent('impassable');
                    } else {
                        // Raise the tile
                        symbol.background = '#222222ff';
                        symbol.foreground = '#FFFFFFff';
                        entity.setComponent(new OpacityComponent(true));
                        entity.setComponent(new ImpassableComponent());
                    }

                    // Update the symbol component to trigger a re-render
                    entity.setComponent(symbol);
                }
            }
        }
    }
} 