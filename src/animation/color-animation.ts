import { Color, EasingFunction } from '../display/types';
import { interpolateColor } from '../display/util/color';
import { logger } from '../util/logger';
import { AnimationConfig, AnimationModule, AnimationProperty } from './animation-module';

export interface ColorProperty extends AnimationProperty {
    start: Color;
    end: Color;
}

export interface ColorAnimationConfig extends AnimationConfig {
    fg?: ColorProperty;
    bg?: ColorProperty;
}

export class ColorAnimationModule extends AnimationModule<Record<string, Color>, ColorAnimationConfig> {
    protected interpolateValue(config: ColorAnimationConfig, progress: number): Record<string, Color> {
        const result: Record<string, Color> = {};
        
        if (config.fg) {
            result.fg = interpolateColor(config.fg.start, config.fg.end, progress);
        }
        if (config.bg) {
            result.bg = interpolateColor(config.bg.start, config.bg.end, progress);
        }
        
        return result;
    }
} 