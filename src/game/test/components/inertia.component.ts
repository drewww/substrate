import { Component } from '../../../entity/component';
import { RegisterComponent } from '../../../entity/component-registry';
import { Direction } from '../../../types';

@RegisterComponent('inertia')
export class InertiaComponent extends Component {
    type: 'inertia' = 'inertia';
    
    constructor(
        public direction: Direction,
        public magnitude: number  // 0-8? value representing strength of inertia
    ) {
        super();
    }

    static fromJSON(data: any): InertiaComponent {
        return new InertiaComponent(data.direction, data.magnitude);
    }
} 