import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';
import { RegisterComponent } from '../component-registry';

export type LightFalloff = 'linear' | 'quadratic' | 'exponential' | 'step' | 'none';
export type LightMode = 'bg' | 'fg';

export interface LightEmitterConfig {
    radius: number;
    intensity: number;
    color: string;
    distanceFalloff: LightFalloff;
    facing?: number;     // Angle in radians (0 = right, π/2 = up, π = left, 3π/2 = down), if set makes this a directional light
    width?: number;      // Width of the light beam in radians, required if facing is set
    xOffset?: number;    // -0.5 to 0.5, relative to tile center
    yOffset?: number;    // -0.5 to 0.5, relative to tile center
    mode?: LightMode;    // Whether to affect background ('bg') or foreground ('fg') color
    removeOnComplete?: boolean;
    lightSourceTile?: boolean;  // Whether to render a light tile at the entity's position (default: true)
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
        // Set default for lightSourceTile
        this.config.lightSourceTile = config.lightSourceTile ?? true;
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
            facing: config.facing,
            width: config.width,
            xOffset: config.xOffset,
            yOffset: config.yOffset,
            mode: config.mode ?? 'bg',
            animation: config.animation
        });
    }
} 