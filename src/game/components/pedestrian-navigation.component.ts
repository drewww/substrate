import { Component } from '../../entity/component';
import { EditorComponent } from '../../entity/components/editor-component';
import { RegisterComponent } from '../../entity/component-registry';

@RegisterComponent('pedestrian-navigation')
export class PedestrianNavigationComponent extends Component implements EditorComponent {
    static readonly type = 'pedestrian-navigation';
    readonly type = PedestrianNavigationComponent.type;
    readonly editorOnly = true;

    constructor(
    ) {
        super();
    }
}