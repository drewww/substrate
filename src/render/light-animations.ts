import { ColorAnimationProperty } from '../animation/color-animation';
import { ValueAnimationProperty } from '../animation/value-animation';
import { Easing, Transform } from '../display/display';

export type LightAnimationType = 'pulse-intensity' | 'pulse-radius' | 'strobe' | 'flicker' | 'rgb' | 'rotate' | 'offset-rotate' | 'pulse-width' | 'charge-shoot' | 'aoe-charge-shoot' | 'charge-shoot-complex';

export interface LightAnimationConfig {
    intensity?: ValueAnimationProperty;
    radius?: ValueAnimationProperty;
    color?: ColorAnimationProperty;
    xOffset?: ValueAnimationProperty;
    yOffset?: ValueAnimationProperty;
    facing?: ValueAnimationProperty;
    width?: ValueAnimationProperty;
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
            duration: [2, 2, 8, 10, 5, 3, 2, 1, 1],
            reverse: true,
            loop: true,
            easing: Easing.maxDelay
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
    },

    'pulse-width': {
        width: {
            range: Math.PI / 2,
            offset: Math.PI / 4,
            duration: 2,
            loop: true,
            easing: Easing.sineInOut,
            transform: Transform.linear
        }
    },


    'charge-shoot': {
        width: {
            start: 0,
            end: Math.PI,
            duration: 0.5,
            easing: Easing.expoInOut,
            next: {
                start: Math.PI,
                end: 0,
                duration: 0.5,
                easing: Easing.expoInOut
            }
        },

        intensity: {
            start: 0.0,
            end: 0.2,
            duration: 0.5,
            easing: Easing.linear,
            next: {
                start: 0.2,
                end: 0.8,
                duration: 0.5,
                easing: Easing.linear
            }
        }
    },

    'charge-shoot-complex': {
        width: {
            start: 0,
            end: Math.PI,
            duration: 0.5,
            easing: Easing.expoInOut,
            next: {
                start: Math.PI,
                end: 0,
                duration: 0.5,
                easing: Easing.expoInOut
            }
        },
        radius: {
            start: 0,
            end: 2,
            duration: 0.5,
            easing: Easing.expoIn,
            next: {
                start: 2,
                end: 18,
                duration: 0.5,
                easing: Easing.expoInOut
            }
        },
        intensity: {
            start: 0.0,
            end: 0.2,
            duration: 0.5,
            easing: Easing.linear,
            next: {
                start: 0.2,
                end: 0.8,
                duration: 0.5,
                easing: Easing.linear
            }
        }
    },

    'aoe-charge-shoot': {
        radius: {
            start: 0,
            end: 4,
            duration: 1,
            easing: Easing.linear,
            next: {
                start: 4,
                end: 0,
                duration: 0.05,
                easing: Easing.linear
            }
        },
    }
}; 