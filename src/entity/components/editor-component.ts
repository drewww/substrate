import { Component } from '../component';

export interface EditorComponent extends Component {
    readonly editorOnly: boolean;
}