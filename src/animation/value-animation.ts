import { EasingFunction } from "../display/types";
import { logger } from "../util/logger";
import { AnimationConfig, AnimationModule, AnimationProperty } from "./animation-module";

export interface ValueProperty extends AnimationProperty {
    start: number;
    end: number;
}

export interface ValueAnimationConfig extends AnimationConfig {
    offsetSymbolX?: ValueProperty;
    offsetSymbolY?: ValueProperty;
    bgPercent?: ValueProperty;
    x?: ValueProperty;
    y?: ValueProperty;
    scaleSymbolX?: ValueProperty;
    scaleSymbolY?: ValueProperty;
    rotation?: ValueProperty;
    intensity?: ValueProperty;
    radius?: ValueProperty;
}

export class ValueAnimationModule extends AnimationModule<Record<string, number>, ValueAnimationConfig> {
    protected interpolateValue(config: ValueAnimationConfig, progress: number): Record<string, number> {
        const result: Record<string, number> = {};
        
        for (const [key, prop] of Object.entries(config)) {
            // logger.info(`Interpolating value animation with key: ${key} and prop: ${JSON.stringify(prop)}`);
            if (key === 'startTime' || key === 'running') continue;
            
            if (prop && typeof prop === 'object' && 'start' in prop && 'end' in prop) {
                result[key] = prop.start + (prop.end - prop.start) * progress;
            }
        }
        return result;
    }
} 