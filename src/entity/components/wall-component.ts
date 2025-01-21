import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

export enum WallDirection {
    NORTH = 0,
    SOUTH = 1,
    EAST = 2,
    WEST = 3
}

export enum WallProperty {
    RENDER = 0,
    OPAQUE = 1,
    IMPASSABLE = 2
}

export interface WallData {
    properties: [boolean, boolean, boolean];  // [render, opaque, impassable]
    color: string;
}

export interface WallConfig {
    north?: WallData;
    west?: WallData;
}

@RegisterComponent('wall')
export class WallComponent extends Component {
    public readonly type = 'wall';
    
    private walls: Map<WallDirection, WallData> = new Map();

    constructor(config: WallConfig = {}) {
        super();
        this.walls.set(WallDirection.NORTH, {
            properties: config.north?.properties ?? [false, false, false],
            color: config.north?.color ?? '#FFFFFF'
        });
        this.walls.set(WallDirection.WEST, {
            properties: config.west?.properties ?? [false, false, false],
            color: config.west?.color ?? '#FFFFFF'
        });
    }

    static fromJSON(data: any): WallComponent {
        return new WallComponent({
            north: {
                properties: data.north?.properties,
                color: data.north?.color
            },
            west: {
                properties: data.west?.properties,
                color: data.west?.color
            }
        });
    }

    toJSON(): any {
        return {
            north: this.walls.get(WallDirection.NORTH),
            west: this.walls.get(WallDirection.WEST)
        };
    }

    setWallProperties(direction: WallDirection, render: boolean, opaque: boolean, impassable: boolean, color?: string): void {
        if (direction === WallDirection.NORTH || direction === WallDirection.WEST) {
            const currentWall = this.walls.get(direction);
            this.walls.set(direction, {
                properties: [render, opaque, impassable],
                color: color ?? currentWall?.color ?? '#FFFFFF'
            });
        }
    }

    getWallProperties(direction: WallDirection): [boolean, boolean, boolean] {
        return [...(this.walls.get(direction)?.properties ?? [false, false, false])];
    }

    getWallColor(direction: WallDirection): string {
        return this.walls.get(direction)?.color ?? '#FFFFFF';
    }

    hasAnyProperties(direction: WallDirection): boolean {
        return this.walls.get(direction)?.properties.some(prop => prop) ?? false;
    }
} 