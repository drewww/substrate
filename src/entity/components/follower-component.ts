import { Component, SerializedComponent } from '../component';
import { Point } from '../../types';
import { RegisterComponent } from '../component-registry';
@RegisterComponent('follower')
export class FollowerComponent extends Component {
    readonly type = 'follower';
    
    constructor(
        public followedEntityId: string | null = null,
        public lastKnownPosition: Point | null = null
    ) {
        super();
    }

    clone(): Component {
        return new FollowerComponent(this.followedEntityId, this.lastKnownPosition);
    }
    
    serialize(): SerializedComponent {
        return {
            type: this.type,
            followedEntityId: this.followedEntityId,
            lastKnownPosition: this.lastKnownPosition
        };
    }
    
} 