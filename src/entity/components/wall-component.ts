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

const DEFAULT_WALL_DATA: WallData = {
    properties: [false, false, false],
    color: '#FFFFFF'
};

export interface WallConfig {
    north?: WallData;
    west?: WallData;
}

@RegisterComponent('wall')
export class WallComponent extends Component {
    public readonly type = 'wall';
    
    public north: WallData = { ...DEFAULT_WALL_DATA };
    public west: WallData = { ...DEFAULT_WALL_DATA };

    constructor(config: WallConfig = {}) {
        super();
        if (config.north) {
            this.north = {
                properties: [...config.north.properties],
                color: config.north.color
            };
        }
        
        if (config.west) {
            this.west = {
                properties: [...config.west.properties],
                color: config.west.color
            };
        }
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
} 