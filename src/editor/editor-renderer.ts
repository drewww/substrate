import { BaseRenderer } from '../render/base-renderer';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Component } from '../entity/component';
import { Display } from '../display/display';
import { World } from '../world/world';
import { BlendMode } from '../display/types';

export class EditorRenderer extends BaseRenderer {
    private highlightTileId: string | null = null;

    constructor(world: World, display: Display) {
        super(world, display);
    }

    public handleEntityAdded(entity: Entity, tileId: string): void {
        // Store the mapping between entity and tile
        this.entityTiles.set(entity.getId(), tileId);
        this.tileEntities.set(tileId, entity.getId());
    }

    public handleEntityModified(entity: Entity, componentType: string): void {
       
    }

    public handleComponentModified(entity: Entity, componentType: string): void {
        // Delegate to entityModified for now
        this.handleEntityModified(entity, componentType);
    }

    public handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        
    }

    public handleEntityRemoved(entity: Entity): void {
    }

    public handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        return true;
    }

    public highlightCell(point: Point | null): void {
        // Remove existing highlight
        if (this.highlightTileId) {
            this.display.removeTile(this.highlightTileId);
            this.highlightTileId = null;
        }

        // Add new highlight if point provided
        if (point) {
            this.highlightTileId = this.display.createTile(
                point.x,
                point.y,
                ' ',
                '#00000000',
                '#FFFFFF44',
                1000, // High z-index to stay on top
                { blendMode: BlendMode.SourceOver }
            );
        }
    }

    public handleUpdate(timestamp: number): void {
        // No special update logic needed for editor
    }
} 