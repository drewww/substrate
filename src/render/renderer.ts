import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { Color } from '../display/types';

export class Renderer {
    private entityTiles: Map<string, string> = new Map(); // entityId -> tileId

    constructor(
        private world: World,
        private display: Display
    ) {
        this.world.on('entityAdded', ({ entity }) => this.onEntityAdded(entity));
        this.world.on('entityRemoved', ({ entity }) => this.onEntityRemoved(entity));
        this.world.on('entityMoved', ({ entity, to }) => this.onEntityMoved(entity, to));
    }

    private onEntityAdded(entity: Entity): void {
        const position = entity.getPosition();
        const tileId = this.display.createTile(
            position.x,
            position.y,
            '@',  // Default representation for now
            '#ffffff' as Color,  // White
            '#000000' as Color,  // Black background
            1  // Default z-index
        );
        
        this.entityTiles.set(entity.getId(), tileId);
    }

    private onEntityRemoved(entity: Entity): void {
        const tileId = this.entityTiles.get(entity.getId());
        if (tileId) {
            this.display.removeTile(tileId);
            this.entityTiles.delete(entity.getId());
        }
    }

    private onEntityMoved(entity: Entity, newPosition: Point): void {
        const tileId = this.entityTiles.get(entity.getId());
        if (tileId) {
            this.display.moveTile(tileId, newPosition.x, newPosition.y);
        }
    }
} 