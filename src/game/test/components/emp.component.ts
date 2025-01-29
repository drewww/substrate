import { Component } from "../../../entity/component";
import { RegisterComponent } from "../../../entity/component-registry";

@RegisterComponent('emp')
export class EMPComponent extends Component {
    type: 'emp' = 'emp';

    constructor(turnsSinceEngaged: number=0) {
        super();
    }

    static fromJSON(data: any): EMPComponent {
        return new EMPComponent();
    }

    toJSON(): any {
        return {};
    }
}