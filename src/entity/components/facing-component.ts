import { Component } from "../component";
import { RegisterComponent } from "../component-registry";
import { Direction } from "../../types";

@RegisterComponent('facing')
export class FacingComponent extends Component {
    readonly type = 'facing';

    constructor(
        public direction: Direction = Direction.East
    ) {
        super();
    }

    clone(): FacingComponent {
        return new FacingComponent(this.direction);
    }
} 