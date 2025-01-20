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
    
    public north: [boolean, boolean, boolean];
    public west: [boolean, boolean, boolean];

    constructor(config: WallConfig = {}) {
        super();
        this.north = config.north ?? [false, false, false];
        this.west = config.west ?? [false, false, false];
    }

    static fromJSON(data: any): WallComponent {
        return new WallComponent({
            north: data.north,
            west: data.west
        });
    }

    toJSON(): any {
        return {
            north: this.north,
            west: this.west
        };
    }

    // Helper methods to make the code more readable
    setWallProperties(direction: 'north' | 'west', render: boolean, opaque: boolean, impassable: boolean): void {
        this[direction] = [render, opaque, impassable];
    }

    getWallProperties(direction: 'north' | 'west'): [boolean, boolean, boolean] {
        return [...this[direction]];
    }

    hasAnyProperties(direction: 'north' | 'west'): boolean {
        return this[direction].some(prop => prop);
    }
} 