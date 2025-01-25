import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

export interface CooldownState {
    current: number;
    base: number;
    ready: boolean;
}

@RegisterComponent('cooldown')
export class CooldownComponent extends Component {
    readonly type = 'cooldown';
    private cooldowns: Map<string, CooldownState> = new Map();

    constructor() {
        super();
    }

    setCooldown(type: string, baseTime: number, initialCooldown?: number): void {
        this.cooldowns.set(type, {
            current: initialCooldown ?? baseTime,
            base: baseTime,
            ready: false
        });
    }

    getCooldown(type: string): CooldownState | undefined {
        return this.cooldowns.get(type);
    }

    resetCooldown(type: string): void {
        const cooldown = this.cooldowns.get(type);
        if (cooldown) {
            cooldown.current = cooldown.base;
            cooldown.ready = false;
        }
    }

    removeCooldown(type: string): void {
        this.cooldowns.delete(type);
    }

    getAllCooldowns(): Map<string, CooldownState> {
        return this.cooldowns;
    }

    static fromJSON(data: any): CooldownComponent {
        const component = new CooldownComponent();
        Object.entries(data.cooldowns).forEach(([type, state]) => {
            component.cooldowns.set(type, state as CooldownState);
        });
        return component;
    }
} 