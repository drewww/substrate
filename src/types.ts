import { FillDirection } from "./matrix-display";

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
}

export interface Cell {
    tiles: Tile[];
    isDirty: boolean;
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

export interface ColorAnimation {
    startColor: Color;
    endColor: Color;
    duration: number;      // Time in seconds for one cycle
    startTime: number;     // Timestamp when animation started
    reverse: boolean;      // Whether to reverse direction at endpoints
    offset: number;        // Initial offset (0-1)
}

export interface SymbolAnimation {
    symbols: string[];
    startTime: number;
    duration: number;     // Time in seconds for one complete cycle
    reverse: boolean;     // Whether to reverse at end
    offset: number;      // Initial offset (0-1)
}

export interface ValueAnimation {
    startValue: number;
    endValue: number;
    duration: number;      // Time in seconds for one cycle
    startTime: number;     // Timestamp when animation started
    reverse: boolean;      // Whether to reverse direction at endpoints
    offset: number;        // Initial offset (0-1)
}
