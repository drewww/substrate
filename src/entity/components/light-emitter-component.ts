import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';

export interface LightEmitterConfig {
    radius: number;
    intensity: number;
    color: string;
    falloff: 'linear' | 'quadratic' | 'exponential';
    facing?: number;     // Angle in radians (0 = right, π/2 = up, π = left, 3π/2 = down)
    spread?: number;     // Total angle of light spread in radians (e.g., π/2 for 90° cone)
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