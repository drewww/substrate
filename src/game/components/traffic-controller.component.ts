import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('traffic-controller') 
export class TrafficControllerComponent extends Component {
    readonly type = 'traffic-controller';
    constructor(
        public currentPhase: number = 0,   // Which phase is currently active (0 or 1),
        public blockId: number = 0
    ) {
        super();
    }
}