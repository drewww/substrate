import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

@RegisterComponent('moveCooldown')
export class MoveCooldownComponent extends Component {
    readonly type = 'moveCooldown';
    cooldown: number;
    baseTime: number;
    ready: boolean = false;

    constructor(baseTime: number, initialCooldown?: number) {
        super();
        this.baseTime = baseTime;
        this.cooldown = initialCooldown ?? baseTime;
    }

    static fromJSON(data: any): MoveCooldownComponent {
        return new MoveCooldownComponent(data.baseTime, data.cooldown);
    }
} 