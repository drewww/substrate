import { Component } from "../../../entity/component";
import { RegisterComponent } from "../../../entity/component-registry";

@RegisterComponent('brake')
export class BrakeComponent extends Component {
    type: 'brake' = 'brake';

    constructor() {
        super();
    }

    static fromJSON(data: any): BrakeComponent {
        return new BrakeComponent();
    }

    toJSON(): any {
        return {};
    }
}