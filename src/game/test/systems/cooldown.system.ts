import { World } from '../../../world/world';
import { CooldownComponent } from '../components/cooldown.component';

export class CooldownSystem {
    constructor(private world: World) {}

    tick(): void {
        const entities = this.world.getEntitiesWithComponent('cooldown');

        for (const entity of entities) {
            const cooldownComponent = entity.getComponent('cooldown') as CooldownComponent;
            let modified = false;

            for (const [type, state] of cooldownComponent.getAllCooldowns()) {
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