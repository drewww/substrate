import { World } from '../../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { logger } from '../../../util/logger';

export class CooldownCleanupSystem {
    constructor(private world: World) {}

    tick(): void {
        const entities = this.world.getEntitiesWithComponent('cooldown');

        for (const entity of entities) {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            let modified = false;

            for (const [name, state] of cooldowns.getAllCooldowns()) {
                if (state.ready) {
                    // Reset cooldown to base value and clear ready flag
                    cooldowns.setCooldown(name, state.base, state.base, false);
                    modified = true;
                    // logger.info(`Reset cooldown ${name} for entity ${entity.getId()}`);

                    if(name === 'stun' && state.current <= 0) {
                        logger.info(`Removing stun component from entity ${entity.getId()}`);
                        entity.removeComponent('stun');
                    }
                }
            }
            
            if (modified) {
                entity.setComponent(cooldowns);
            }
        }
    }
} 