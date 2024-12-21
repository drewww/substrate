import { Display, Easing } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { Color } from '../display/types';
import { logger } from '../display/util/logger';
import { FadeComponent } from '../entity/component';
import { SmokeBombComponent } from '../entity/component';
import { SymbolComponent } from '../entity/component';

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
        const symbolComponent = entity.getComponent('symbol') as SymbolComponent;
        if (!symbolComponent) {
            return; // Don't render entities without symbol components
        }

        const position = entity.getPosition();
        const tileId = this.display.createTile(
            position.x,
            position.y,
            symbolComponent.char,
            symbolComponent.foreground,
            symbolComponent.background,
            symbolComponent.zIndex
        );
        
        this.entityTiles.set(entity.getId(), tileId);

        // Handle fade component if present
        if (entity.hasComponent('fade')) {
            const fade = entity.getComponent('fade') as FadeComponent;
            if (fade) {
                this.display.addColorAnimation(tileId, {
                    bg: {
                        start: '#FFFFFFFF',
                        end: '#FFFFFF00',
                        duration: fade.duration,
                        easing: Easing.linear
                    }
                });
            }
        }
    }

    private onEntityModified(entity: Entity, componentType: string): void {
        if (componentType === 'symbol') {
            const tileId = this.entityTiles.get(entity.getId());
            const symbol = entity.getComponent('symbol') as SymbolComponent;
            if (tileId && symbol) {
                this.display.updateTile(tileId, {
                    char: symbol.char,
                    fg: symbol.foreground,
                    bg: symbol.background,
                    zIndex: symbol.zIndex
                });
            }
        }
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
            this.display.moveTile(tileId, to.x, to.y);
        } else {
            logger.warn(`No tile found for moved entity ${entity.getId()}`);
        }
    }
} 