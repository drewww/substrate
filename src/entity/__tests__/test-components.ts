import { Component } from '../component';
import { transient } from '../../decorators/transient';
import { RegisterComponent } from '../component-registry';

@RegisterComponent('test')
export class TestComponent extends Component {
    readonly type = 'test';
    value: number = 100;
    
    @transient
    transientValue?: boolean;

    static fromJSON(data: any): TestComponent {
        const component = new TestComponent();
        component.value = data.value;
        return component;
    }
}

@RegisterComponent('updatable')
export class UpdatableComponent extends Component {
    readonly type = 'updatable';
    value: number = 0;

    update(deltaTime: number) {
        this.value = deltaTime;
        return true;
    }

    static fromJSON(data: any): UpdatableComponent {
        return new UpdatableComponent();
    }
} 