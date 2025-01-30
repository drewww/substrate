import { Component } from "../../../entity/component";
import { RegisterComponent } from "../../../entity/component-registry";

export enum ApplyTimestampType {
    Start = 'start',
    Stop = 'stop'
}

@RegisterComponent('applyTimestamp')
export class ApplyTimestampComponent extends Component { 
    type: 'applyTimestamp' = 'applyTimestamp';

    constructor(public apply: ApplyTimestampType) {
        super();
    }

    static fromJSON(data: any): ApplyTimestampComponent {
        return new ApplyTimestampComponent(data.apply);
    }

    toJSON(): any {
        return {
            apply: this.apply
        };
    }
}