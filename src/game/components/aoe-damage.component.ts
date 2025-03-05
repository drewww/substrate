import { Component } from '../../entity/component';
import { RegisterComponent } from '../../entity/component-registry';

@RegisterComponent('aoe-damage')
export class AOEDamageComponent extends Component {
    readonly type = 'aoe-damage';

    constructor(
        public radius: number = 3,
        public damage: number = 1,
    ) {
        super();
    }
    
} 
