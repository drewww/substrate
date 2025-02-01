import { Component, SerializedComponent } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('followable')
export class FollowableComponent extends Component {
    readonly type = 'followable';

    clone(): Component {
        return new FollowableComponent();
    }
    
    serialize(): SerializedComponent {
        return { type: this.type };
    }
} 