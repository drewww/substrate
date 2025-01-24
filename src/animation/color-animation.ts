import { interpolateColor } from '../display/util/color';
import { AnimationConfig, AnimationModule, AnimationProperty } from './animation-module';

export interface ColorAnimationProperty extends AnimationProperty {
    start: string;  // Hex color string
    end: string;    // Hex color string
    next?: ColorAnimationProperty;
    removeOnComplete?: boolean;
}

export interface ColorAnimationConfig extends AnimationConfig {
    fg?: ColorAnimationProperty;
    bg?: ColorAnimationProperty;
    color?: ColorAnimationProperty;  // Add this for light colors
}

export class ColorAnimationModule extends AnimationModule<Record<string, string>, ColorAnimationConfig> {
    protected interpolateValue(config: ColorAnimationConfig, progress: number): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (config.fg) {
            result.fg = interpolateColor(config.fg.start, config.fg.end, progress);
        }
        if (config.bg) {
            result.bg = interpolateColor(config.bg.start, config.bg.end, progress);
        }
        if (config.color) {
            result.color = interpolateColor(config.color.start, config.color.end, progress);
        }
        
        // logger.info(`interpolation result: ${JSON.stringify(result)} for progress: ${progress}`);
        return result;
    }
} 