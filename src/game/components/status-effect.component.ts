import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";

export enum StatusEffect {
    EMP = 'emp',
    CALTROPS = 'caltrops'
}

@RegisterComponent('status-effect')
export class StatusEffectComponent extends Component {
    type: 'status-effect' = 'status-effect';

    constructor(public effect: StatusEffect = StatusEffect.CALTROPS) {
        super();
    }

    static fromJSON(data: any): StatusEffectComponent {
        return new StatusEffectComponent();
    }

    toJSON(): any {
        return {};
    }
}