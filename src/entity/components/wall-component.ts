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

export interface WallConfig {
    north?: [boolean, boolean, boolean];  // [render, opaque, impassable]
    west?: [boolean, boolean, boolean];   // [render, opaque, impassable]
}

@RegisterComponent('wall')
export class WallComponent extends Component {
    public readonly type = 'wall';
    
    private walls: Map<WallDirection, [boolean, boolean, boolean]> = new Map();

    constructor(config: WallConfig = {}) {
        super();
        this.walls.set(WallDirection.NORTH, config.north ?? [false, false, false]);
        this.walls.set(WallDirection.WEST, config.west ?? [false, false, false]);
    }

    static fromJSON(data: any): WallComponent {
        return new WallComponent({
            north: data.north,
            west: data.west
        });
    }

    toJSON(): any {
        return {
            north: this.walls.get(WallDirection.NORTH),
            west: this.walls.get(WallDirection.WEST)
        };
    }

    // Helper methods to make the code more readable
    setWallProperties(direction: WallDirection, render: boolean, opaque: boolean, impassable: boolean): void {
        if (direction === WallDirection.NORTH || direction === WallDirection.WEST) {
            this.walls.set(direction, [render, opaque, impassable]);
        }
    }

    getWallProperties(direction: WallDirection): [boolean, boolean, boolean] {
        return [...(this.walls.get(direction) ?? [false, false, false])];
    }

    hasAnyProperties(direction: WallDirection): boolean {
        return this.walls.get(direction)?.some(prop => prop) ?? false;
    }
} 