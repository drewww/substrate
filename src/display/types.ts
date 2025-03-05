export type Color = string; // CSS color string in #RRGGBBAA format

export type TileId = string;

export interface Cell {
    tiles: Tile[];
}

export interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ColorMap {
    [key: string]: string;  // Maps single-char aliases to full color values
}

export interface ColoredString {
    text: string;
    colorMap: ColorMap;
}

export type EasingFunction = (t: number) => number;
export type TransformFunction = (t: number) => number;

// Keep existing ColorAnimation for backward compatibility
export interface ColorAnimation {
    startColor: Color;
    endColor: Color;
    duration: number;
    startTime: number;
    reverse: boolean;
    loop: boolean;
    offset: number;
    easing?: EasingFunction;
    next?: ColorAnimation;  // Reference to the next animation in the chain
    running: boolean;  // Add running flag
}

export interface SymbolAnimation {
    symbols: string[];
    startTime: number;
    duration: number;     // Time in seconds for one complete cycle
    reverse: boolean;     // Whether to reverse at end
    loop: boolean;
    offset: number;      // Initial offset (0-1)
    easing?: EasingFunction;  // Optional easing function
    running: boolean;  // Add running flag
}

export interface ValueAnimation {
    startValue: number;
    endValue: number;
    duration: number;      
    startTime: number;     
    reverse: boolean;      
    offset: number;        
    easing: EasingFunction;
    loop: boolean;
    next?: ValueAnimation;  // Add chaining support
    running: boolean;  // Add running flag
}

export enum EasingType {
    Linear = 'linear',
    SineIn = 'sineIn',
    SineOut = 'sineOut',
    SineInOut = 'sineInOut',
    QuadIn = 'quadIn',
    QuadOut = 'quadOut',
    QuadInOut = 'quadInOut',
    CubicIn = 'cubicIn',
    CubicOut = 'cubicOut',
    CubicInOut = 'cubicInOut',
    ExpoIn = 'expoIn',
    ExpoOut = 'expoOut',
    ExpoInOut = 'expoInOut',
    BounceIn = 'bounceIn',
    BounceOut = 'bounceOut',
    BounceInOut = 'bounceInOut'
}

export interface TileConfig {
    bgPercent?: number;
    fillDirection?: FillDirection;
    noClip?: boolean;
    blendMode?: BlendMode;
    alwaysRenderIfExplored?: boolean;
    rotation?: number;
    scaleSymbolX?: number;
    scaleSymbolY?: number;
    offsetSymbolX?: number;
    offsetSymbolY?: number;
    walls?: [boolean, boolean];  // [north, west]
    wallColors?: [string | null, string | null];  // [north, west]
    wallOverlays?: Array<{
        direction: 'north' | 'west';
        color: string;
        blendMode: BlendMode;
    }>;
    fontWeight?: string;
    fontStyle?: string;
    fontFamily?: string;
}

// BELOW HERE ARE TYPES SPECIFICALLY FOR EXTENDED FUNCTION ARGUMENTS
// Calling these "options."

// Base animation options that all animations share
export interface AnimationOptions {
    duration: number;
    reverse?: boolean;
    loop?: boolean;
    offset?: number;
    easing?: EasingFunction;
}

// Base interface for chaining
export interface ChainableAnimation {
    next?: ColorAnimationOptions;  // Reference to the next animation in chain
}

// Update ColorTransitionOptions to be chainable
export interface ColorAnimationOptions extends AnimationOptions, ChainableAnimation {
    start: Color;
    end: Color;
}

export interface ValueAnimationOption {
    start: number;
    end: number;
    duration: number;
    reverse?: boolean;
    offset?: number;
    easing?: EasingFunction;
    loop?: boolean;
    next?: ValueAnimationOption;  // Add chaining support
}

export interface TileValueAnimationsOptions {
    bgPercent?: ValueAnimationOption;
    offsetSymbolX?: ValueAnimationOption;
    offsetSymbolY?: ValueAnimationOption;
    scaleSymbolX?: ValueAnimationOption;
    scaleSymbolY?: ValueAnimationOption;
    rotation?: ValueAnimationOption;  // New animation option
    x?: ValueAnimationOption;
    y?: ValueAnimationOption;
    startTime?: number;
}

// Options for color animations
export interface TileColorAnimationOptions {
    fg?: ColorAnimationOptions;
    bg?: ColorAnimationOptions;
    startTime?: number;
}

export enum BlendMode {
    SourceOver = 'source-over',
    Multiply = 'multiply',
    Screen = 'screen',
    Overlay = 'overlay',
    Darken = 'darken',
    Lighten = 'lighten',
    ColorDodge = 'color-dodge',
    ColorBurn = 'color-burn',
    HardLight = 'hard-light',
    SoftLight = 'soft-light',
    Difference = 'difference',
    Exclusion = 'exclusion'
}

export interface TileUpdateConfig {
    char?: string;
    fg?: Color;
    bg?: Color;
    zIndex?: number;
    bgPercent?: number;
    fillDirection?: FillDirection;
    noClip?: boolean;
    blendMode?: BlendMode;
    alwaysRenderIfExplored?: boolean;
    rotation?: number;
    offsetSymbolX?: number;
    offsetSymbolY?: number;
    fontWeight?: string;
    fontStyle?: string;
    fontFamily?: string;
    scaleSymbolX?: number;
    scaleSymbolY?: number;
    lockRotationToFacing?: boolean;
}

export interface PerformanceMetrics {
    lastRenderTime: number;
    averageRenderTime: number;
    totalRenderCalls: number;
    fps: number;
    lastFpsUpdate: number;
    frameCount: number;
    symbolAnimationCount: number;
    colorAnimationCount: number;
    valueAnimationCount: number;
    lastAnimationUpdateTime: number;
    lastWorldUpdateTime: number;
    averageAnimationTime: number;
    averageWorldUpdateTime: number;
    lastDirtyTileCount: number;
    averageDirtyTileCount: number;
}

export interface DisplayOptions {
    elementId?: string;
    cellWidth: number;
    cellHeight: number;
    worldWidth: number;
    worldHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    defaultFont?: string;
    customFont?: string;
}

export interface StringOptions {
    text: string;
    options?: {
        zIndex?: number;
        backgroundColor?: string;
        textBackgroundColor?: string;
        fillBox?: boolean;
        padding?: number;
    };
}

export enum FillDirection {
    TOP = 0,
    RIGHT = 1,
    BOTTOM = 2,
    LEFT = 3
}

// A collection of easing functions that translate an input value between 0 and 1 into an output value between 0 and 1
export const Easing = {
    // Linear (no easing)
    linear: (t: number): number => t,

    // Sine
    sineIn: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),
    sineOut: (t: number): number => Math.sin((t * Math.PI) / 2),
    sineInOut: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
    
    // Quadratic
    quadIn: (t: number): number => t * t,
    quadOut: (t: number): number => 1 - (1 - t) * (1 - t),
    quadInOut: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    
    // Cubic
    cubicIn: (t: number): number => t * t * t,
    cubicOut: (t: number): number => 1 - Math.pow(1 - t, 3),
    cubicInOut: (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    
    // Exponential
    expoIn: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    expoOut: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    expoInOut: (t: number): number => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    
    // Bounce
    bounceOut: (t: number): number => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    bounceIn: (t: number): number => 1 - Easing.bounceOut(1 - t),
    bounceInOut: (t: number): number => 
        t < 0.5 ? (1 - Easing.bounceOut(1 - 2 * t)) / 2 : (1 + Easing.bounceOut(2 * t - 1)) / 2,

    round: (t: number): number => Math.round(t),
    maxDelay: (t: number): number => t >= 0.99 ? 1 : 0,
    flicker: (t: number): number => {
        if (t >= 0.99) {
            return 1;
        } if (t <= 0.97 && t >= 0.96) {
            return 1;
        } if (t <= 0.95 && t >= 0.94) {
            return 1;
        } else {
            return 0;
        }
    },
};

// Similar but different to Easing functions. These take a value between 0 and 1, but can return  a value from
// [-Infinity, Infinity]. In practice, they are used to transform the output of an easing function into
// a domain in a non-linear manner.
// 
// This is necessary because the basic linear transform, which the vast majority of animations use, cannot
// create cyclic behavior because it assumes starting at the min value in a range and ending at the max value.
// Obviously that does not work for all animations.

export const Transform = {
    linear: (t: number): number => t,
    cosine: (t: number): number => Math.cos(t * Math.PI * 2),
    sine: (t: number): number => Math.sin(t * Math.PI * 2),
}

export interface Tile {
    id: TileId;
    x: number;
    y: number;
    char: string;
    color: Color;
    backgroundColor: Color;
    zIndex: number;
    bgPercent: number;
    fillDirection: FillDirection;
    offsetSymbolX: number;
    offsetSymbolY: number;
    scaleSymbolX: number;
    scaleSymbolY: number;
    rotation: number;
    noClip: boolean;
    blendMode: BlendMode;
    alwaysRenderIfExplored: boolean;
    walls?: [boolean, boolean];  // [north, west]
    wallColors?: [string | null, string | null];  // [north, west]
    wallOverlays?: Array<{
        direction: 'north' | 'west';
        color: string;
        blendMode: BlendMode;
    }>;

    fontWeight?: string;
    fontStyle?: string;
    fontFamily?: string;
}