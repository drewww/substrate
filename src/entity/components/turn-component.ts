import { Component, SerializedComponent } from '../component';
import { Direction } from '../../types';

export class TurnComponent extends Component {
    readonly type = 'turn';
    
    constructor(
        public direction: Direction
    ) {
        super();
    }

    clone(): Component {
        return new TurnComponent(this.direction);
    }

    serialize(): SerializedComponent {
        return {
            type: this.type,
            direction: this.direction
        };
    }
} 