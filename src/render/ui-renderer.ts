import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { Renderer } from './renderer-interface';
import { InertiaComponent } from '../game/test/components/inertia.component';

export class UIRenderer implements Renderer {
    private uiTiles: Map<string, string> = new Map(); // region -> tileId
    private readonly height: number;
    private readonly width: number;

    constructor(
        private readonly display: Display,
        private readonly player: Entity
    ) {
        this.height = display.getViewportHeight();
        this.width = display.getViewportWidth();
        this.initializeUI();
    }

    private initializeUI(): void {
        // Create black background for bottom row
        for (let x = 0; x < this.width; x++) {
            const tileId = this.display.createTile(
                x,
                this.height - 1,
                ' ',
                '#FFFFFFFF',
                '#000000FF',
                1000, // Above world tiles
            );
            this.uiTiles.set(`bg_${x}`, tileId);
        }

        // Create speed indicator tile
        const speedTileId = this.display.createTile(
            0,
            this.height - 1,
            '0',
            '#FFFFFFFF',
            '#000000FF',
            1001, // Above background
        );
        this.uiTiles.set('speed', speedTileId);

        // Update initial speed value
        this.updateSpeedIndicator();
    }

    private updateSpeedIndicator(): void {
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const speedTileId = this.uiTiles.get('speed');
        if (speedTileId) {
            const magnitude = inertia.magnitude ?? 0;
            this.display.updateTile(speedTileId, {
                char: magnitude.toString(),
            });
        }
    }

    update(timestamp: number): void {
        // No animation updates needed for now
    }

    handleEntityAdded(entity: Entity, tileId: string): void {
        // Only care about player for now
    }

    handleEntityModified(entity: Entity, componentType: string): void {
        if (entity === this.player && componentType === 'inertia') {
            this.updateSpeedIndicator();
        }
    }

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

    handleEntityRemoved(entity: Entity): void {
        // Only care about player for now
    }

    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        // UI doesn't need to handle movement
        return true;
    }
} 