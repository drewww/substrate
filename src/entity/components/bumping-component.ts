import { Component } from '../component';
import { Point } from '../../types';

export class BumpingComponent extends Component {
    readonly type = 'bumping';
    
    constructor(
        public direction: Point,
        public duration: number = 0.1  // Duration in seconds
    ) {
        super();
    }
} 