import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('vision')
export class VisionComponent extends Component {
    type: string = 'vision';

    constructor(public radius: number = 8, public ignoreOpacity: boolean = false) {
        super();
    }

} 