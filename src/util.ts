import { Direction, Point } from "./types";

export function directionToPoint(direction: Direction): Point {
    switch (direction) {
        case Direction.North: return { x: 0, y: -1 };
        case Direction.South: return { x: 0, y: 1 };
        case Direction.West: return { x: -1, y: 0 };
        case Direction.East: return { x: 1, y: 0 };
        case Direction.None: return { x: 0, y: 0 };
    }
}

export function pointToDirection(point: Point): Direction {
    if(point.x === 0 && point.y === -1) return Direction.North;
    if(point.x === 0 && point.y === 1) return Direction.South;
    if(point.x === -1 && point.y === 0) return Direction.West;
    if(point.x === 1 && point.y === 0) return Direction.East;
    if(point.x === 0 && point.y === 0) return Direction.None;
    throw new Error(`Invalid point: ${point.x}, ${point.y}`);
}

export function directionToRadians(direction: Direction): number {
    switch (direction) {
        case Direction.South: return Math.PI / 2;  // Up
        case Direction.East: return 0;           // Right
        case Direction.North: return -Math.PI / 2;   // Down
        case Direction.West: return Math.PI;      // Left
        case Direction.None: return 0;  /// this is bad ... not sure what to do. 
    }
}

export function isOppositeDirection(dir1: Direction, dir2: Direction): boolean {
    return (
        (dir1 === Direction.North && dir2 === Direction.South) ||
        (dir1 === Direction.South && dir2 === Direction.North) ||
        (dir1 === Direction.East && dir2 === Direction.West) ||
        (dir1 === Direction.West && dir2 === Direction.East)
    );
}

export function getTargetPosition(pos: Point, direction: Direction): Point {
    switch (direction) {
        case Direction.North: return { x: pos.x, y: pos.y - 1 };
        case Direction.South: return { x: pos.x, y: pos.y + 1 };
        case Direction.West: return { x: pos.x - 1, y: pos.y };
        case Direction.East: return { x: pos.x + 1, y: pos.y };
        case Direction.None: return pos;
    }
}

export function getOppositeDirection(direction: Direction): Direction {
    switch (direction) {
        case Direction.North: return Direction.South;
        case Direction.South: return Direction.North;
        case Direction.West: return Direction.East;
        case Direction.East: return Direction.West;
        case Direction.None: return Direction.None;
    }
}
