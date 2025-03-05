import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { Renderer } from './renderer';
import { InertiaComponent } from '../game/components/inertia.component';
import { TimestampComponent } from '../game/components/timestamp.component';
import { logger } from '../util/logger';
import { HealthComponent } from '../entity/components/health.component';

export class UISpeedRenderer implements Renderer {
    private uiTiles: Map<string, string[]> = new Map(); // region -> tileIds[]
    private readonly uiDisplay: Display;
    private readonly MAX_SPEED = 12;  // Updated to 12 from 8
    private readonly MAX_HEALTH = 12;
    private readonly GEAR_X = 0;  // Gear indicator position
    private readonly SPEED_START_X = 1;  // Speed bar starts 2 tiles in
    private readonly HEALTH_START_X = 15;  // Start health display after speed
    private readonly TIME_X = 35;  // Position for time display
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
    private readonly HEALTH_COLORS = [
        '#ff0000FF',  // Low health - light red
        '#dd0000FF',
        '#cc0000FF',
        '#bb0000FF',
        '#aa0000FF',
        '#990000FF',
        '#880000FF',
        '#770000FF',
        '#660000FF',
        '#550000FF',
        '#440000FF',
        '#330000FF'   // Full health - deep red
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
            this.uiTiles.set(`bg_${x}`, [tileId]);
        }

        // Create gear indicator tile
        // const gearTileId = this.uiDisplay.createTile(
        //     this.GEAR_X,
        //     0,
        //     '1',  // Initial gear
        //     '#FFFFFFFF',
        //     '#000000FF',
        //     1001,
        //     {
        //         walls: [true, false],  // [north, west] - only north wall
        //         wallColors: ['#FFFFFFFF', null]  // Semi-transparent white for north wall
        //     }
        // );
        // this.uiTiles.set('gear', gearTileId);

        // Create health indicator tiles
        for (let i = 0; i < this.MAX_HEALTH; i++) {
            const healthTileId = this.uiDisplay.createTile(
                this.HEALTH_START_X + i,
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
            this.uiTiles.set(`health_${i}`, [healthTileId]);
        }

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
            this.uiTiles.set(`speed_${i}`, [speedTileId]);
        }

        // Initialize time display tiles (reserve space for "00.00s")
        // const timeTileIds = this.uiDisplay.createString(
        //     this.TIME_X,
        //     0,
        //     '     ',  // 5 spaces for "00.00"
        //     1001
        // );
        // this.uiTiles.set('time', timeTileIds);

        this.updateSpeedIndicator();
        this.updateHealthIndicator();
    }

    private updateSpeedIndicator(): void {
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const magnitude = inertia?.magnitude ?? 0;

        // Update gear display

        // Update speed tiles
        for (let i = 0; i < this.MAX_SPEED; i++) {
            const speedTileIds = this.uiTiles.get(`speed_${i}`);
            if (speedTileIds) {
                for (const speedTileId of speedTileIds) {
                    this.uiDisplay.updateTile(speedTileId, {
                        bg: i < magnitude ? this.SPEED_COLORS[i] : '#00000000'
                    });
                }
            }
        }
    }

    private updateHealthIndicator(): void {
        const health = this.player.getComponent('health') as HealthComponent;
        const currentHealth = health?.health ?? 0;

        for (let i = 0; i < this.MAX_HEALTH; i++) {
            const healthTileIds = this.uiTiles.get(`health_${i}`);
            if (healthTileIds) {
                for (const healthTileId of healthTileIds) {
                    this.uiDisplay.updateTile(healthTileId, {
                        bg: i < currentHealth ? this.HEALTH_COLORS[i] : '#00000000'
                    });
                }
            }
        }
    }

    private updateTimeDisplay(): void {
        const timestamp = this.player.getComponent('timestamp') as TimestampComponent;
        if (!timestamp) return;

        //remove old time tiles
        const timeTileIds = this.uiTiles.get('time');
        if (timeTileIds) {
            this.uiDisplay.removeTiles(timeTileIds);
        }

        const elapsed = (performance.now() - timestamp.start) / 1000;
        // logger.warn("Time since applied: " + (performance.now() - timestamp.start));
        // const timeTileIds = this.uiTiles.get('time');
        // if (!timeTileIds) return;

        const newTimeTileIds = this.uiDisplay.createString(this.TIME_X, 0, `${elapsed.toFixed(2)}s`, 1001,);
        this.uiTiles.set('time', newTimeTileIds);

        for(const tileId of newTimeTileIds) {
            this.uiDisplay.updateTile(tileId, {
                fg: '#11FF11FF',
                bg: '#00000000'
            });
        }


        // const timestamp = this.player.getComponent('timestamp') as TimestampComponent;
        // if (timestamp) {
        //     const secondsElapsed = ((Date.now() - timestamp.start) / 1000).toFixed(2);
        //     // Remove old tiles
        //     this.uiDisplay.removeTiles(timeTileIds);
        //     // Create new tiles with updated time
        //     const newTileIds = this.uiDisplay.createString(
        //         this.TIME_X,
        //         0,
        //         `${secondsElapsed}s`,
        //         1001
        //     );
        //     this.uiTiles.set('time', newTileIds);
        // } else {
        //     // Clear the display if no timestamp
        //     this.uiDisplay.removeTiles(timeTileIds);
        //     const emptyTileIds = this.uiDisplay.createString(
        //         this.TIME_X,
        //         0,
        //         '     ',
        //         1001
        //     );
        //     this.uiTiles.set('time', emptyTileIds);
        // }
    }

    update(timestamp: number): void {
        this.updateTimeDisplay();
    }

    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {
        if (entity === this.player) {
            if (componentType === 'inertia') {
                this.updateSpeedIndicator();
            } else if (componentType === 'timestamp') {
                // this.updateTimeDisplay();
            } else if (componentType === 'health') {
                this.updateHealthIndicator();
            }
        }
    }
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (entity === this.player) {
            if (componentType === 'inertia') {
                this.updateSpeedIndicator();
            } else if (componentType === 'timestamp') {
                // this.updateTimeDisplay();
            } else if (componentType === 'health') {
                this.updateHealthIndicator();
            }
        }
    }
} 