export type Color = string; // CSS color string in #RRGGBBAA format

export type TileId = string;

export interface Tile {
    id: TileId;
    symbol: string;
    fgColor: Color | null;
    bgColor: Color | null;
    zIndex: number;
    x: number;
    y: number;
}

export interface Cell {
    overlay: Color;
    tiles: Tile[];
    isDirty: boolean;
}

export interface Viewport {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DisplayOptions {
    elementId: string;
    cellSize: number;
    worldWidth: number;
    worldHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    defaultFont?: string;
    customFont?: string;
}
