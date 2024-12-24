import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('discoveredByPlayer')
export class DiscoveredByPlayerComponent extends Component {
    readonly type = 'discoveredByPlayer';
    
    static fromJSON(): DiscoveredByPlayerComponent {
        return new DiscoveredByPlayerComponent();
    }
} 