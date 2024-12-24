import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

@RegisterComponent('moveCooldown')
export class MoveCooldownComponent extends Component {
    type: 'moveCooldown' = 'moveCooldown';
    
    constructor(
        public cooldown: number = 4,    // Current cooldown in milliseconds
        public baseTime: number = 4      // Reset to this value after moving
    ) {
        super();
    }

    static fromJSON(data: any): MoveCooldownComponent {
        return new MoveCooldownComponent(data.cooldown, data.baseTime);
    }
} 