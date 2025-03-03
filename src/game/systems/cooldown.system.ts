import { World } from '../../world/world';
import { CooldownComponent } from '../components/cooldown.component';
import { StunComponent } from '../components/stun.component';

export class CooldownSystem {
    constructor(private world: World) {}

    tick(): void {
        const entities = this.world.getEntitiesWithComponent('cooldown');

        for (const entity of entities) {
            const cooldownComponent = entity.getComponent('cooldown') as CooldownComponent;
            let modified = false;

            const stun = entity.getComponent('stun') as StunComponent;

            for (const [type, state] of cooldownComponent.getAllCooldowns()) {

                // don't tick other cooldowns if entity is stunned
                if(stun && type != 'stun') {
                    continue;
                }

                if (state.current > 0) {
                    state.current -= 1;
                    modified = true;

                    if (state.current <= 0) {
                        state.current = 0;
                        state.ready = true;
                    }
                }
            }

            if (modified) {
                entity.setComponent(cooldownComponent);
            }
        }
    }
} 