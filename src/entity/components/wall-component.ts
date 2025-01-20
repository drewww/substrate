import { Component } from '../component';
import { RegisterComponent } from '../component-registry';

export enum WallDirection {
    NORTH = 0,
    SOUTH = 1,
    EAST = 2,
    WEST = 3
}

export interface WallConfig {
    north?: boolean;      // Wall on north edge
    west?: boolean;       // Wall on west edge
    northOpaque?: boolean;  // Is the north wall opaque
    westOpaque?: boolean;   // Is the west wall opaque
    northPassable?: boolean;  // Can entities pass through north wall
    westPassable?: boolean;   // Can entities pass through west wall
}

@RegisterComponent('wall')
export class WallComponent extends Component {
    public readonly type = 'wall';
    
    public north: boolean;
    public west: boolean;
    public northOpaque: boolean;
    public westOpaque: boolean;
    public northPassable: boolean;
    public westPassable: boolean;

    constructor(config: WallConfig = {}) {
        super();
        this.north = config.north ?? false;
        this.west = config.west ?? false;
        this.northOpaque = config.northOpaque ?? false;
        this.westOpaque = config.westOpaque ?? false;
        this.northPassable = config.northPassable ?? false;
        this.westPassable = config.westPassable ?? false;
    }

    static fromJSON(data: any): WallComponent {
        return new WallComponent({
            north: data.north,
            west: data.west,
            northOpaque: data.northOpaque,
            westOpaque: data.westOpaque,
            northPassable: data.northPassable,
            westPassable: data.westPassable
        });
    }

    toJSON(): any {
        return {
            north: this.north,
            west: this.west,
            northOpaque: this.northOpaque,
            westOpaque: this.westOpaque,
            northPassable: this.northPassable,
            westPassable: this.westPassable
        };
    }
} 