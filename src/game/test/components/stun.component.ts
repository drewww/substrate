import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

@RegisterComponent('stun')
export class StunComponent extends Component {
    type: 'stun' = 'stun';
    
    constructor(
        public duration: number = 3000,    // Duration in milliseconds
        public cooldown: number = 3000
    ) {
        super();

        this.duration = duration;
        this.cooldown = cooldown;
    }

    static fromJSON(data: any): StunComponent {
        return new StunComponent(data.duration, data.cooldown);
    }
} 