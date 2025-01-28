import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';

@RegisterComponent('gear')
export class GearComponent extends Component {
    public readonly type = 'gear';

    public gear: number;

    constructor(initialGear: number = 1) {
        super();
        this.gear = initialGear;
    }

    static fromJSON(data: any): GearComponent {
        return new GearComponent(data.gear);
    }

    toJSON(): any {
        return {
            gear: this.gear
        };
    }
} 