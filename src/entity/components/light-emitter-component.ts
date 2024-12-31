import { Component } from '../component';

export interface LightConfig {
    radius: number;
    intensity: number;
    color: string;
    falloff: 'linear' | 'quadratic' | 'exponential';
}

export class LightEmitterComponent extends Component {
    public readonly type = 'lightEmitter';
    
    constructor(public config: LightConfig) {
        super();
    }
} 