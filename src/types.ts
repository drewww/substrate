export type Color = string; // CSS color string in #RRGGBBAA format

export interface Tile {
    symbol: string | null;
    fgColor: Color | null;
    bgColor: Color | null;
    zIndex: number;
    groupId?: string;
}

export interface Background {
    symbol: string;
    fgColor: Color;
    bgColor: Color;
}

export interface Cell {
    overlay: Color;
    tiles: Tile[];
    background: Background;
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

export interface TileGroup {
    id: string;
    positions: Array<{x: number, y: number}>;
} 