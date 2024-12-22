import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { SymbolComponent } from '../entity/component';
import { logger } from '../util/logger';

/**
 * Base renderer class that handles entity visualization
 * 
 * Events handled:
 * - entityModified: When components are added/removed from an entity
 * - entityMoved: When an entity's position changes
 * - componentModified: When values within a component are updated
 */
export abstract class Renderer {
    protected entityTiles: Map<string, string> = new Map(); // entityId -> tileId

    constructor(
        protected world: World,
        protected display: Display
    ) {
        this.world.on('entityAdded', ({ entity }) => this.onEntityAdded(entity));
        this.world.on('entityRemoved', ({ entity }) => this.onEntityRemoved(entity));
        this.world.on('entityMoved', ({ entity, to }) => this.onEntityMoved(entity, to));
        this.world.on('entityModified', ({ entity, componentType }) => this.onEntityModified(entity, componentType));
        this.world.on('componentModified', ({ entity, componentType }) => this.onComponentModified(entity, componentType));
    }

    /**
     * Handle entity addition
     */
    protected onEntityAdded(entity: Entity): void {
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
        
        this.handleEntityAdded(entity, tileId);
    }

    /**
     * Handle component addition/removal
     */
    protected onEntityModified(entity: Entity, componentType: string): void {
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
        this.handleEntityModified(entity, componentType);
    }

    /**
     * Handle component value changes
     */
    protected onComponentModified(entity: Entity, componentType: string): void {
        this.handleComponentModified(entity, componentType);
    }

    /**
     * Handle entity removal
     */
    protected onEntityRemoved(entity: Entity): void {
        logger.debug(`Renderer received entityRemoved event for entity ${entity.getId()}`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            logger.debug(`Found tile ${tileId} for entity ${entity.getId()}, removing...`);
            this.display.removeTile(tileId);
            this.entityTiles.delete(entity.getId());
        } else {
            logger.warn(`No tile found for removed entity ${entity.getId()}`);
        }
        
        this.handleEntityRemoved(entity);
    }

    /**
     * Handle entity move
     */
    protected onEntityMoved(entity: Entity, to: Point): void {
        logger.debug(`Renderer handling entity move for ${entity.getId()} to (${to.x},${to.y})`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            this.display.moveTile(tileId, to.x, to.y);
        } else {
            logger.warn(`No tile found for moved entity ${entity.getId()}`);
        }
        
        this.handleEntityMoved(entity, to);
    }

    // Update abstract methods
    protected abstract handleEntityAdded(entity: Entity, tileId: string): void;
    protected abstract handleEntityModified(entity: Entity, componentType: string): void;
    protected abstract handleComponentModified(entity: Entity, componentType: string): void;
    protected abstract handleEntityRemoved(entity: Entity): void;
    protected abstract handleEntityMoved(entity: Entity, to: Point): void;
}  