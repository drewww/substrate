import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('locked')
export class LockedComponent extends Component {
    type: 'locked' = 'locked';

    constructor(public lastTurnLocked: number = 0) {
        super();
    }
}