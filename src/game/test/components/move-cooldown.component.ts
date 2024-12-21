import { Component } from '../../../entity/component';

export class MoveCooldownComponent extends Component {
    type: 'moveCooldown' = 'moveCooldown';
    
    constructor(
        public cooldown: number = 4000,    // Current cooldown in milliseconds
        public baseTime: number = 4000      // Reset to this value after moving
    ) {
        super();
    }

    static fromJSON(data: any): MoveCooldownComponent {
        return new MoveCooldownComponent(data.cooldown, data.baseTime);
    }
} 