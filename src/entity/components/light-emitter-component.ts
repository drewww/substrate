import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';
import { RegisterComponent } from '../component-registry';

export type LightMode = 'omnidirectional' | 'beam';

export interface LightEmitterConfig {
    radius: number;
    intensity: number;
    color: string;
    falloff: 'linear' | 'quadratic' | 'exponential' | 'step';
    mode: LightMode;
    facing?: number;     // Angle in radians (0 = right, π/2 = up, π = left, 3π/2 = down), required for 'beam' mode
    width?: number;     // Width of the light beam in tiles
    // New properties for sub-tile positioning
    xOffset?: number;    // -0.5 to 0.5, relative to tile center
    yOffset?: number;    // -0.5 to 0.5, relative to tile center
    animation?: {
        type: LightAnimationType;
        params?: {
            speed?: 'slow' | 'normal' | 'fast';
            intensity?: number;  // How dramatic the effect is (0-1)
        }
    };
}

@RegisterComponent('lightEmitter')
export class LightEmitterComponent extends Component {
    public readonly type = 'lightEmitter';
    
    constructor(
        public config: LightEmitterConfig
    ) {
        super();
        // Validate beam mode has facing direction
        if (config.mode === 'beam' && config.facing === undefined) {
            throw new Error('Beam mode requires facing direction');
        }
    }

    static fromJSON(data: any): LightEmitterComponent {
        return new LightEmitterComponent(data.config);
    }

    // Helper method to create from config object, with defaults
    static fromConfig(config: Partial<LightEmitterConfig>): LightEmitterComponent {
        return new LightEmitterComponent({
            radius: config.radius ?? 5,
            intensity: config.intensity ?? 1.0,
            color: config.color ?? '#FFFFFF',
            falloff: config.falloff ?? 'quadratic',
            mode: config.mode ?? 'omnidirectional',
            facing: config.facing,
            width: config.width,
            xOffset: config.xOffset,
            yOffset: config.yOffset,
            animation: config.animation
        });
    }
} 