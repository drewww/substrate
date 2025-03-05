import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('health')
export class HealthComponent extends Component {
    readonly type = 'health';

    constructor(
        public health: number = 12,
        public maxHealth: number = 12
    ) {
        super();
    }
    
} 
