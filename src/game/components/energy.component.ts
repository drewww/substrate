import { Component } from '../../entity/component';
import { RegisterComponent } from '../../entity/component-registry';

@RegisterComponent('energy')
export class EnergyComponent extends Component {
    type: 'energy' = 'energy';
    
    constructor(
        public energy: number = 100,
    ) {
        super();
    }
} 