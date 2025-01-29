import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { Renderer } from './renderer';
import { InertiaComponent } from '../game/test/components/inertia.component';

export class UISpeedRenderer implements Renderer {
    private uiTiles: Map<string, string> = new Map(); // region -> tileId
    private readonly uiDisplay: Display;
    private readonly MAX_SPEED = 12;  // Updated to 12 from 8
    private readonly GEAR_X = 0;  // Gear indicator position
    private readonly SPEED_START_X = 2;  // Speed bar starts 2 tiles in
    private readonly SPEED_COLORS = [
        '#ffd70088',  // Speed 1 - light yellow
        '#ffbb0088',  // Speed 2
        '#ff990088',  // Speed 3
        '#ff770088',  // Speed 4
        '#ff550088',  // Speed 5
        '#ff330088',  // Speed 6
        '#ff110088',  // Speed 7
        '#ff000088',  // Speed 8 - dark orange
        '#dd000088',  // Speed 9 - darkening red
        '#bb000088',  // Speed 10
        '#990000aa',  // Speed 11
        '#770000cc'   // Speed 12 - deep red with higher opacity
    ];

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
        // Create black background for bottom row with top walls
        for (let x = 0; x < this.uiDisplay.getViewportWidth(); x++) {
            const tileId = this.uiDisplay.createTile(
                x,
                0,  // Always y=0 since we only have one row
                ' ',
                '#FFFFFFFF',
                '#000000FF',
                1000,
                {
                    walls: [true, false],  // [north, west] - only north wall
                    wallColors: ['#FFFFFFFF', null]  // Semi-transparent white for north wall
                }
            );
            this.uiTiles.set(`bg_${x}`, tileId);
        }

        // Create gear indicator tile
        const gearTileId = this.uiDisplay.createTile(
            this.GEAR_X,
            0,
            '1',  // Initial gear
            '#FFFFFFFF',
            '#000000FF',
            1001,
            {
                walls: [true, false],  // [north, west] - only north wall
                wallColors: ['#FFFFFFFF', null]  // Semi-transparent white for north wall
            }
        );
        this.uiTiles.set('gear', gearTileId);

        // Create speed indicator tiles (shifted right)
        for (let i = 0; i < this.MAX_SPEED; i++) {
            const speedTileId = this.uiDisplay.createTile(
                this.SPEED_START_X + i,
                0,
                ' ',
                '#FFFFFFFF',
                '#00000000',
                1001,
                {
                    walls: [true, false],
                    wallColors: ['#FFFFFF88', null]
                }
            );
            this.uiTiles.set(`speed_${i}`, speedTileId);
        }

        this.updateSpeedIndicator();
    }

    private updateSpeedIndicator(): void {
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const magnitude = inertia?.magnitude ?? 0;

        // Update gear display

        // Update speed tiles
        for (let i = 0; i < this.MAX_SPEED; i++) {
            const speedTileId = this.uiTiles.get(`speed_${i}`);
            if (speedTileId) {
                this.uiDisplay.updateTile(speedTileId, {
                    bg: i < magnitude ? this.SPEED_COLORS[i] : '#00000000'
                });
            }
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
        if (entity === this.player && (componentType === 'inertia')) {
            this.updateSpeedIndicator();
        }
    }
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (entity === this.player && componentType === 'inertia') {
            this.updateSpeedIndicator();
        }
    }
} 