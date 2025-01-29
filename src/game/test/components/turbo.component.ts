import { Component } from "../../../entity/component";
import { RegisterComponent } from "../../../entity/component-registry";

@RegisterComponent('turbo')
export class TurboComponent extends Component {
    type: 'turbo' = 'turbo';

    constructor() {
        super();
    }

    static fromJSON(data: any): TurboComponent {
        return new TurboComponent();
    }

    toJSON(): any {
        return {};
    }
}