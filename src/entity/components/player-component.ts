import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('player')
export class PlayerComponent extends Component {
    readonly type = 'player';
} 