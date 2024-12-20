import { Component } from '../component';

export class TestComponent extends Component {
    public readonly type = 'test';
    
    constructor(public value: any = null) {
        super();
    }

    toJSON() {
        return {
            type: this.type,
            value: this.value
        };
    }

    static fromJSON(data: any): TestComponent {
        return new TestComponent(data.value);
    }
}

export class HealthComponent extends Component {
    public readonly type = 'health';
    
    constructor(public current: number = 100, public max: number = 100) {
        super();
    }

    toJSON() {
        return {
            type: this.type,
            current: this.current,
            max: this.max
        };
    }

    static fromJSON(data: any): HealthComponent {
        return new HealthComponent(data.current, data.max);
    }
} 