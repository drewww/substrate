import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { Color } from '../display/types';
import { logger } from '../display/util/logger';

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
        logger.debug(`Renderer received entityRemoved event for entity ${entity.getId()}`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            logger.debug(`Found tile ${tileId} for entity ${entity.getId()}, removing...`);
            this.display.removeTile(tileId);
            this.entityTiles.delete(entity.getId());
        } else {
            logger.warn(`No tile found for removed entity ${entity.getId()}`);
        }
    }

    private onEntityMoved(entity: Entity, newPosition: Point): void {
        const tileId = this.entityTiles.get(entity.getId());
        if (tileId) {
            this.display.moveTile(tileId, newPosition.x, newPosition.y);
        }
    }
} 