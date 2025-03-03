import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('turbo')
export class TurboComponent extends Component {
    type: 'turbo' = 'turbo';


    public turnsSinceEngaged: number;
    constructor(turnsSinceEngaged: number=0) {
        super();
        this.turnsSinceEngaged = turnsSinceEngaged;
    }

    static fromJSON(data: any): TurboComponent {
        return new TurboComponent(data.turnsSinceEngaged);
    }

    toJSON(): any {
        return {
            turnsSinceEngaged: this.turnsSinceEngaged,
        };
    }
}