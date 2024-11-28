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

export interface SymbolAnimation {
    symbols: string[];
    currentIndex: number;
    frameDelay: number;
    frameCount: number;
}
