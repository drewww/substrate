import { AnimationProperty } from '../animation/animation-module';
import { Easing } from '../display/display';

export type LightAnimationType = 'pulse-intensity' | 'pulse-radius' | 'strobe';

export interface NumericAnimationProperty extends Omit<AnimationProperty<number>, 'start' | 'end' | 'symbols'> {
    start: number;
    end: number;
}

export interface LightAnimationConfig {
    intensity?: NumericAnimationProperty;
    radius?: NumericAnimationProperty;
    color?: AnimationProperty<string>;
}

export const LIGHT_ANIMATIONS: Record<LightAnimationType, LightAnimationConfig> = {
    "pulse-intensity": {
        intensity: {
            start: 0.7,
            end: 1.1,
            duration: 0.15,
            reverse: true,
            loop: true,
            easing: Easing.linear
        }
    },
    "pulse-radius": {
        radius: {
            start: 0.8,
            end: 1.2,
            duration: 1.0,
            reverse: true,
            loop: true,
            easing: Easing.sineInOut
        },
    },
    strobe: {
        intensity: {
            start: 0.0,
            end: 1.0,
            duration: 0.1,
            reverse: true,
            loop: true,
            easing: Easing.round
        }
    },
}; 