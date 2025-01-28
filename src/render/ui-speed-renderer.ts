import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { Renderer } from './renderer';
import { InertiaComponent } from '../game/test/components/inertia.component';

export class UISpeedRenderer implements Renderer {
    private uiTiles: Map<string, string> = new Map(); // region -> tileId
    private readonly uiDisplay: Display;

    constructor(
        private readonly player: Entity
    ) {
        // Create UI display with same cell dimensions but only 1 row
        this.uiDisplay = new Display({
            elementId: 'ui-overlay',
            cellWidth: 20,
            cellHeight: 20,
            viewportWidth: 40,
            viewportHeight: 1,
            worldWidth: 40,
            worldHeight: 1
        });

        // Position UI canvas absolutely
        const canvas = this.uiDisplay.getRenderCanvas();
        canvas.style.position = 'absolute';
        canvas.style.bottom = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';  // Let clicks pass through

        this.initializeUI();
    }

    private initializeUI(): void {
        // Create black background for bottom row
        for (let x = 0; x < this.uiDisplay.getViewportWidth(); x++) {
            const tileId = this.uiDisplay.createTile(
                x,
                0,  // Always y=0 since we only have one row
                ' ',
                '#FFFFFFFF',
                '#000000FF',
                1000
            );
            this.uiTiles.set(`bg_${x}`, tileId);
        }

        // Create speed indicator tile
        const speedTileId = this.uiDisplay.createTile(
            0,
            0,
            '0',
            '#FFFFFFFF',
            '#000000FF',
            1001  // Above background
        );
        this.uiTiles.set('speed', speedTileId);

        this.updateSpeedIndicator();
    }

    private updateSpeedIndicator(): void {
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const speedTileId = this.uiTiles.get('speed');
        if (speedTileId && inertia) {
            const magnitude = inertia.magnitude ?? 0;
            this.uiDisplay.updateTile(speedTileId, {
                char: magnitude.toString()
            });
        }
    }

    update(timestamp: number): void {
        // this.uiDisplay.render(timestamp);
        
    }

    handleEntityAdded(entity: Entity, tileId: string): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {
        if (entity === this.player && componentType === 'inertia') {
            this.updateSpeedIndicator();
        }
    }
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (entity === this.player && componentType === 'inertia') {
            this.updateSpeedIndicator();
        }
    }
} 