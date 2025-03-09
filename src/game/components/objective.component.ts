import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('objective')
export class ObjectiveComponent extends Component {
    type: 'objective' = 'objective';

    constructor(public active: boolean = false, public eligible: boolean = false,
        public objectiveType: 'end' | 'vehicle' = 'vehicle', public index: number = 0) {
        super();
    }
}