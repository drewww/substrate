import { Component, SerializedComponent } from '../../entity/component';
import { RegisterComponent } from '../../entity/component-registry';

export interface CooldownState {
    current: number;
    base: number;
    ready: boolean;
}

@RegisterComponent('cooldown')
export class CooldownComponent extends Component {
    readonly type = 'cooldown';
    private cooldowns: Map<string, CooldownState> = new Map();

    constructor(initialCooldowns?: Record<string, CooldownState>) {
        super();
        if (initialCooldowns) {
            Object.entries(initialCooldowns).forEach(([type, state]) => {
                this.cooldowns.set(type, state);
            });
        }
    }

    setCooldown(type: string, baseTime: number, initialCooldown?: number, ready?: boolean): void {
        this.cooldowns.set(type, {
            current: initialCooldown ?? baseTime,
            base: baseTime,
            ready: ready ?? false
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

    setCooldownReady(type: string, ready: boolean): void {
        const cooldown = this.cooldowns.get(type);
        if (cooldown) {
            cooldown.ready = ready;
        }
    }

    removeCooldown(type: string): void {
        this.cooldowns.delete(type);
    }

    getAllCooldowns(): Map<string, CooldownState> {
        return this.cooldowns;
    }

    public clone(): CooldownComponent {
        const cooldownsCopy = new Map<string, CooldownState>();
        for (const [key, state] of this.cooldowns.entries()) {
            cooldownsCopy.set(key, { ...state });
        }
        return new CooldownComponent(Object.fromEntries(cooldownsCopy));
    }


    deserialize(data: any): void {
        // Convert plain object back to Map
        this.cooldowns = new Map(
            Object.entries(data.cooldowns || {})
        );
    }

    serialize(): SerializedComponent {
        // Convert Map to plain object for JSON
        const cooldownsObj: { [key: string]: CooldownState } = {};
        this.cooldowns.forEach((value, key) => {
            cooldownsObj[key] = value;
        });

        return {
            type: this.type,
            cooldowns: cooldownsObj
        };
    }
} 