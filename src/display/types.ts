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
    rotation: number;     // New property: rotation in radians
    noClip?: boolean;     // New option to disable clipping mask
    blendMode: BlendMode;  // Now required with a default value
    alwaysRenderIfExplored?: boolean;
    walls?: [boolean, boolean];
    wallColor?: Color;
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
    walls?: [boolean, boolean];
    wallColor?: Color;
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
}