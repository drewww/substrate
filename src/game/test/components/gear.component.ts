import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

@RegisterComponent('gear')
export class GearComponent extends Component {
    public readonly type = 'gear';

    public gear: number;
    public queuedShift: number;

    constructor(initialGear: number = 1, queuedShift: number = 0) {
        super();
        this.gear = initialGear;
        this.queuedShift = queuedShift;
    }

    static fromJSON(data: any): GearComponent {
        return new GearComponent(data.gear, data.queuedShift);
    }

    toJSON(): any {
        return {
            gear: this.gear,
            queuedShift: this.queuedShift
        };
    }
} 