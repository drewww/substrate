import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';

export interface LightEmitterConfig {
    radius: number;
    intensity: number;
    color: string;
    falloff: 'linear' | 'quadratic' | 'exponential';
    animation?: {
        type: LightAnimationType;
        params?: {
            speed?: 'slow' | 'normal' | 'fast';
            intensity?: number;  // How dramatic the effect is (0-1)
        }
    };
}

export class LightEmitterComponent extends Component {
    public readonly type = 'lightEmitter';
    
    constructor(
        public config: LightEmitterConfig
    ) {
        super();
    }
} 