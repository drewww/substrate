import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';
import { RegisterComponent } from '../component-registry';

export type LightFalloff = 'linear' | 'quadratic' | 'exponential' | 'step';

export interface LightEmitterConfig {
    radius: number;
    intensity: number;
    color: string;
    distanceFalloff: LightFalloff;
    angleFalloff?: LightFalloff;
    facing?: number;     // Angle in radians (0 = right, π/2 = up, π = left, 3π/2 = down), if set makes this a directional light
    width?: number;      // Width of the light beam in radians, required if facing is set
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
        // Validate that if facing is set, width is also set
        if (config.facing !== undefined && config.width === undefined) {
            throw new Error('Directional lights (with facing) require width to be set');
        }
    }

    static fromJSON(data: any): LightEmitterComponent {
        return new LightEmitterComponent(data.config);
    }

    static fromConfig(config: Partial<LightEmitterConfig>): LightEmitterComponent {
        return new LightEmitterComponent({
            radius: config.radius ?? 5,
            intensity: config.intensity ?? 1.0,
            color: config.color ?? '#FFFFFF',
            distanceFalloff: config.distanceFalloff ?? 'quadratic',
            angleFalloff: config.angleFalloff ?? 'linear',
            facing: config.facing,
            width: config.width,
            xOffset: config.xOffset,
            yOffset: config.yOffset,
            animation: config.animation
        });
    }
} 