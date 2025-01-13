import { EasingFunction, TransformFunction } from "../display/types";
import { logger } from "../util/logger";
import { AnimationConfig, AnimationModule, AnimationProperty } from "./animation-module";

export interface ValueAnimationProperty extends AnimationProperty {
    range?: number;
    offset?: number;
    
    transform?: TransformFunction;
    start?: number;
    end?: number;
}

export interface ValueAnimationConfig extends AnimationConfig {
    offsetSymbolX?: ValueAnimationProperty;
    offsetSymbolY?: ValueAnimationProperty;
    bgPercent?: ValueAnimationProperty;
    x?: ValueAnimationProperty;
    y?: ValueAnimationProperty;
    scaleSymbolX?: ValueAnimationProperty;
    scaleSymbolY?: ValueAnimationProperty;
    rotation?: ValueAnimationProperty;
    intensity?: ValueAnimationProperty;
    radius?: ValueAnimationProperty;
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