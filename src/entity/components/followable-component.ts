import { Component } from '../component';
import { RegisterComponent } from '../component-registry';
import { Point } from '../../types';

@RegisterComponent('followable')
export class FollowableComponent extends Component {
    readonly type = 'followable';

    constructor(
        public followPriority: number = 100,
        public lastPosition: Point | null = null
    ) {
        super();
    }
} 