import { Component } from '../component';
import { Direction } from '../../types';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('turn')
export class TurnComponent extends Component {
    readonly type = 'turn';
    
    constructor()
    {
        super();
    }
} 