import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('impassable')
export class ImpassableComponent extends Component {
    readonly type = 'impassable';
} 