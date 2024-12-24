import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('visibleToPlayer')
export class VisibleToPlayerComponent extends Component {
    readonly type = 'visibleToPlayer';
    
    static fromJSON(): VisibleToPlayerComponent {
        return new VisibleToPlayerComponent();
    }
} 