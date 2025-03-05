import { Component } from '../../entity/component';
import { RegisterComponent } from '../../entity/component-registry';


@RegisterComponent('traffic-light')
export class TrafficLightComponent extends Component {
    type: 'traffic-light' = 'traffic-light';
    
    constructor(
        public blockId: number = 0,
        public phase: number = 0,
        public phaseOffset: number = 0
    ) {
        super();
    }
} 