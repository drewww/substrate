import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('opacity')
export class OpacityComponent extends Component {
    readonly type = 'opacity';
    
    constructor() {
        super();
    }

    static fromJSON(data: any): OpacityComponent {
        return new OpacityComponent();
    }
} 