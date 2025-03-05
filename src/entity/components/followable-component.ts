import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('followable')
export class FollowableComponent extends Component {
    readonly type = 'followable';

    constructor(
        public followPriority: number = 100
    ) {
        super();
    }
} 