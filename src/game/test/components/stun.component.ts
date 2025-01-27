import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';
import { COOLDOWNS } from '../constants';

@RegisterComponent('stun')
export class StunComponent extends Component {
    type: 'stun' = 'stun';
    
    constructor(
        public duration: number = COOLDOWNS.STUN,    // Duration in ticks
        public cooldown: number = COOLDOWNS.STUN
    ) {
        super();
        this.duration = duration;
        this.cooldown = cooldown;
    }

    static fromJSON(data: any): StunComponent {
        return new StunComponent(data.duration, data.cooldown);
    }
} 