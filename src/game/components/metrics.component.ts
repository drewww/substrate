import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

@RegisterComponent('metrics')
export class MetricsComponent extends Component {
    public readonly type = 'metrics';

    constructor(
        public tilesTraveled: number = 0,
        public timesCrashed: number = 0,
        public objectivesSecured: number = 0,
        public tilesDrifted: number = 0
    ) {
        super();
    }
} 