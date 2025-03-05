import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('impathable')
export class ImpathableComponent extends Component {
    readonly type = 'impathable';
} 