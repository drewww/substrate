import { FillDirection } from "./display";

export type Color = string; // CSS color string in #RRGGBBAA format

export type TileId = string;

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
    scaleSymbolX: number;  // Default to 1.0
    scaleSymbolY: number;  // Default to 1.0
    noClip?: boolean;     // New option to disable clipping mask
}

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
}

export interface SymbolAnimation {
    symbols: string[];
    startTime: number;
    duration: number;     // Time in seconds for one complete cycle
    reverse: boolean;     // Whether to reverse at end
    loop: boolean;
    offset: number;      // Initial offset (0-1)
    easing?: EasingFunction;  // Optional easing function
}

export interface ValueAnimation {
    startValue: number;
    endValue: number;
    duration: number;      // Time in seconds for one cycle
    startTime: number;     // Timestamp when animation started
    reverse: boolean;      // Whether to reverse direction at endpoints
    offset: number;        // Initial offset (0-1)
    easing: EasingFunction;  // Optional easing function
    loop: boolean;         // Whether to loop the animation
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
interface ChainableAnimation {
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
}

export interface TileValueAnimationsOptions {
    bgPercent?: ValueAnimationOption;
    offsetSymbolX?: ValueAnimationOption;
    offsetSymbolY?: ValueAnimationOption;
    scaleSymbolX?: ValueAnimationOption;
    scaleSymbolY?: ValueAnimationOption;
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