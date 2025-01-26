import { Component, SerializedComponent } from '../component';

export class FollowableComponent extends Component {
    readonly type = 'followable';

    clone(): Component {
        return new FollowableComponent();
    }
    
    serialize(): SerializedComponent {
        return { type: this.type };
    }
} 