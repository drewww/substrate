import { Transform } from "../display/display";
import { TransformFunction } from "../display/types";
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
            

            if(prop && typeof prop === 'object') {
                // detect transform. if it's null, select linear.
                const transform = prop.transform ?? Transform.linear;

                // if transform is set to linear or is unset, do this.
                if ('start' in prop && 'end' in prop && prop.start != null && prop.end != null &&
                    !isNaN(prop.start) && !isNaN(prop.end)) {
                    result[key] = prop.start + (prop.end - prop.start) * transform(progress);
                } else if ('range' in prop && 'offset' in prop && prop.range != null && prop.offset != null &&
                    !isNaN(prop.range) && !isNaN(prop.offset)) {
                    
                    result[key] = prop.offset + (prop.range * transform(progress));

                    logger.info(`non-linear value animation with offset: ${prop.offset} and range: ${prop.range} and transform: ${transform(progress)} result: ${result[key]} progress: ${progress}`);
                }


            }
        }
        return result;
    }
} 