import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('move')
export class MoveComponent extends Component {
    type: 'move' = 'move';

    constructor(public ignoreImpassable: boolean = false) {
        super();
    }
}