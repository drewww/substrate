import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('reverse')
export class ReverseComponent extends Component {
    type: 'reverse' = 'reverse';

    constructor() {
        super();
    }
    
}