import { Component } from "../../../entity/component";
import { RegisterComponent } from "../../../entity/component-registry";

@RegisterComponent('timestamp')
export class TimestampComponent extends Component {
    type: 'timestamp' = 'timestamp';

    constructor(public start: number) {
        super();
    }

    static fromJSON(data: any): TimestampComponent {
        return new TimestampComponent(data.start);
    }

    toJSON(): any {
        return {
            start: this.start
        };
    }
}