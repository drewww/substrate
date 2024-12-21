import { Display, Easing } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { Color } from '../display/types';
import { logger } from '../display/util/logger';
import { FadeComponent } from '../entity/component';
import { SmokeBombComponent } from '../entity/component';

export class Renderer {
    private entityTiles: Map<string, string> = new Map(); // entityId -> tileId

    constructor(
        private world: World,
        private display: Display
    ) {
        this.world.on('entityAdded', ({ entity }) => this.onEntityAdded(entity));
        this.world.on('entityRemoved', ({ entity }) => this.onEntityRemoved(entity));
        this.world.on('entityMoved', ({ entity, to }) => this.onEntityMoved(entity, to));
        this.world.on('entityModified', ({ entity, componentType }) => this.onEntityModified(entity, componentType));
    }

    private onEntityAdded(entity: Entity): void {
        const position = entity.getPosition();
        let char = '@';  // Default
        let color = '#ffffff' as Color;  // Default white
        let backgroundColor = '#000000' as Color;  // Default black
        let zIndex = 1;  // Default z-index

        // Handle smoke bomb
        if (entity.hasComponent('smokeBomb')) {
            char = '*';
            const smokeBomb = entity.getComponent('smokeBomb') as SmokeBombComponent;
            color = smokeBomb.color as Color;
        }

        // Handle smoke cloud
        if (entity.hasComponent('fade')) {
            char = ' ';  // or '▒' or '█'
            zIndex = 2;  // Put clouds above other entities
        }

        const tileId = this.display.createTile(
            position.x,
            position.y,
            char,
            color,
            backgroundColor,
            zIndex
        );
        
        this.entityTiles.set(entity.getId(), tileId);

        // Handle fade updates
        if (entity.hasComponent('fade')) {
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                const fade = entity.getComponent('fade') as FadeComponent;
                if (fade) {
                    this.display.addColorAnimation(tileId, {
                        bg: {
                            start: '#FFFFFFFF' as Color,  // Fully opaque black
                            end: '#FFFFFF00' as Color,    // Fully transparent black
                            duration: fade.duration,
                            easing: Easing.linear
                        }
                    });
                }
            }
        }
    }

    private onEntityModified(entity: Entity, componentType: string): void {
        
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

    private onEntityMoved(entity: Entity, to: Point): void {
        logger.debug(`Renderer handling entity move for ${entity.getId()} to (${to.x},${to.y})`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            const tile = this.display.getTile(tileId);
            if (tile) {
                const from = { x: tile.x, y: tile.y };
                
                // Add movement animation
                this.display.addValueAnimation(tileId, {
                    x: {
                        start: from.x,
                        end: to.x,
                        duration: 0.2, // 200ms
                        loop: false,
                        easing: Easing.quadOut
                    },
                    y: {
                        start: from.y,
                        end: to.y,
                        duration: 0.2,
                        loop: false,
                        easing: Easing.quadOut
                    }
                });
            }
        } else {
            logger.warn(`No tile found for moved entity ${entity.getId()}`);
        }
    }
} 