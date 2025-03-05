import { Component } from '../component';
import { LightAnimationType } from '../../render/light-animations';
import { RegisterComponent } from '../component-registry';

export type LightFalloff = 'linear' | 'quadratic' | 'exponential' | 'step' | 'step-soft' | 'none';
export type LightMode = 'bg' | 'fg';

export interface LightEmitterConfig {
    radius?: number;
    intensity?: number;
    color?: string;
    distanceFalloff?: LightFalloff;
    facing?: number;     // Angle in radians (0 = right, π/2 = up, π = left, 3π/2 = down)
    width?: number;      // Width of the light beam in radians
    xOffset?: number;    // -0.5 to 0.5, relative to tile center
    yOffset?: number;    // -0.5 to 0.5, relative to tile center
    mode?: LightMode;    // Whether to affect background ('bg') or foreground ('fg') color
    removeOnComplete?: boolean;
    lightSourceTile?: boolean;
    animation?: {
        type: LightAnimationType;
        params?: {
            speed?: 'slow' | 'normal' | 'fast';
            intensity?: number;  // How dramatic the effect is (0-1)
        }
    };
}

const DEFAULT_CONFIG: Required<Omit<LightEmitterConfig, 'animation' | 'facing' | 'width'>> = {
    radius: 5,
    intensity: 1.0,
    color: '#FFFFFF',
    distanceFalloff: 'quadratic',
    xOffset: 0,
    yOffset: 0,
    mode: 'bg',
    removeOnComplete: false,
    lightSourceTile: true
};

@RegisterComponent('lightEmitter')
export class LightEmitterComponent extends Component {
    public readonly type = 'lightEmitter';
    
    constructor(
        public config: LightEmitterConfig = {}
    ) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Validate that if facing is set, width is also set
        if (this.config.facing !== undefined && this.config.width === undefined) {
            throw new Error('Directional lights (with facing) require width to be set');
        }
    }
} 