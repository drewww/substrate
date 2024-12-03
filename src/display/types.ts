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

// Base animation options that all animations share
export interface AnimationOptions {
    duration: number;
    reverse?: boolean;
    loop?: boolean;
    offset?: number;
    easing?: EasingFunction;
}

// Color-specific animation options
export interface ColorTransition extends AnimationOptions {
    start: Color;
    end: Color;
}

// Options for color animations
export interface ColorAnimationOptions {
    fg?: ColorTransition;
    bg?: ColorTransition;
    startTime?: number;
}

// Keep existing ColorAnimation for backward compatibility
export interface ColorAnimation {
    startColor: Color;
    endColor: Color;
    duration: number;
    startTime: number;
    reverse?: boolean;
    loop?: boolean;
    offset: number;
    easing?: EasingFunction;
}

export interface SymbolAnimation {
    symbols: string[];
    startTime: number;
    duration: number;     // Time in seconds for one complete cycle
    reverse: boolean;     // Whether to reverse at end
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
    easing?: EasingFunction;  // Optional easing function
    loop?: boolean;         // Whether to loop the animation
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
