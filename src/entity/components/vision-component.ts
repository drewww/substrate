import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('vision')
export class VisionComponent extends Component {
    type: string = 'vision';
    public radius: number;

    constructor(radius: number = 8) {
        super();

        this.radius = radius;
    }

    fromJSON(json: any): VisionComponent {
        return new VisionComponent(json.radius);
    }
} 