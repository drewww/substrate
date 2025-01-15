import { ColorAnimationProperty } from '../animation/color-animation';
import { ValueAnimationProperty } from '../animation/value-animation';
import { Easing, Transform } from '../display/display';

export type LightAnimationType = 'pulse-intensity' | 'pulse-radius' | 'strobe' | 'flicker' | 'rgb' | 'rotate' | 'offset-rotate';

export interface LightAnimationConfig {
    intensity?: ValueAnimationProperty;
    radius?: ValueAnimationProperty;
    color?: ColorAnimationProperty;
    xOffset?: ValueAnimationProperty;
    yOffset?: ValueAnimationProperty;
    facing?: ValueAnimationProperty;
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

    flicker: {
        intensity: {
            start: 1.0,
            end: 0.0,
            duration: 2,
            reverse: true,
            loop: true,
            easing: Easing.flicker
        }
    },

    rgb: {
        color: {
            start: '#ff0000',
            end: '#00ff00',
            duration: 0.5,
            chainLoop: true,
            next: {
                start: '#00ff00',
                end: '#0000ff',
                duration: 0.5,
                next: {
                    start: '#0000ff',
                    end: '#ff0000',
                    duration: 0.5
                }
            }
        }
    },

    'rotate': {
        facing: {
            range: Math.PI * 2,
            offset: 0,
            duration: 2,
            loop: true,
            easing: Easing.linear,
            transform: Transform.linear
        }
    },

    'offset-rotate': {
        xOffset: {
            range: 0.5,
        offset: 0,
            duration: 2,
            loop: true,
            easing: Easing.linear,
            transform: Transform.cosine
        },
        yOffset: {
            range: 0.5,
            offset: 0,
            duration: 2,
            loop: true,
            easing: Easing.linear,
            transform: Transform.sine
        }
    }
}; 