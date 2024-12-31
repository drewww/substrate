import { Component } from '../component';
import { EasingFunction } from '../../display/types';

export interface LightConfig {
    radius: number;
    intensity: number;
    color: string;
    falloff: 'linear' | 'quadratic' | 'exponential';
}

export interface LightAnimation {
    // Base intensity will be multiplied by these values
    startIntensity: number;  // e.g., 0.8 means 80% of base intensity
    endIntensity: number;    // e.g., 1.2 means 120% of base intensity
    duration: number;        // in seconds
    easing?: EasingFunction;
    loop?: boolean;
    reverse?: boolean;
    next?: LightAnimation;   // For chaining animations
}

export class LightEmitterComponent extends Component {
    public readonly type = 'lightEmitter';
    
    constructor(
        public config: LightConfig,
        public animation?: LightAnimation
    ) {
        super();
    }
} 