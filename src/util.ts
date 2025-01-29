import { Direction, Point } from "./types";

export function directionToPoint(direction: Direction): Point {
    switch (direction) {
        case Direction.North: return { x: 0, y: -1 };
        case Direction.South: return { x: 0, y: 1 };
        case Direction.West: return { x: -1, y: 0 };
        case Direction.East: return { x: 1, y: 0 };
    }
}

export function pointToDirection(point: Point): Direction {
    if(point.x === 0 && point.y === -1) return Direction.North;
    if(point.x === 0 && point.y === 1) return Direction.South;
    if(point.x === -1 && point.y === 0) return Direction.West;
    if(point.x === 1 && point.y === 0) return Direction.East;
    throw new Error(`Invalid point: ${point.x}, ${point.y}`);
}

export function directionToRadians(direction: Direction): number {
    switch (direction) {
        case Direction.South: return -Math.PI / 2;  // Up
        case Direction.East: return 0;           // Right
        case Direction.North: return Math.PI / 2;   // Down
        case Direction.West: return Math.PI;      // Left
    }
}
