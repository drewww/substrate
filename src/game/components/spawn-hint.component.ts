import { Component } from '../../entity/component';
import { EditorComponent } from '../../entity/components/editor-component';
import { RegisterComponent } from '../../entity/component-registry';

export type SpawnHintType = 'camera' | 'turret' | 'boomer' | 'pedestrian';

@RegisterComponent('spawn-hint')
export class SpawnHintComponent extends Component implements EditorComponent {
    static readonly type = 'spawn-hint';
    readonly type = SpawnHintComponent.type;
    readonly editorOnly = true;

    constructor(public readonly hint: string = "camera") {
        super();
    }
}