import { Component } from '../../entity/component';
import { RegisterComponent } from '../../entity/component-registry';
import { Direction } from '../../types';

@RegisterComponent('bufferedMove')  
export class BufferedMoveComponent extends Component {
    type: 'bufferedMove' = 'bufferedMove';
    
    constructor(
        public direction: Direction = Direction.None,
        public keyUp: boolean = false
    ) {
        super();
    }

    static fromJSON(data: any): BufferedMoveComponent {
        return new BufferedMoveComponent(data.direction);
    }

    toJSON(): any {
        return {
            direction: this.direction,
        };
    }
} 