import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('opacity')
export class OpacityComponent extends Component {
    readonly type = 'opacity';
    
    constructor(public readonly isOpaque: boolean = true) {
        super();
    }

    static fromJSON(data: any): OpacityComponent {
        return new OpacityComponent(data.isOpaque);
    }
} 