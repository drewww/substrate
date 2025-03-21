import { Display } from '../display/display';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { Renderer } from './renderer';
import { InertiaComponent } from '../game/components/inertia.component';
import { TimestampComponent } from '../game/components/timestamp.component';
import { logger } from '../util/logger';
import { HealthComponent } from '../entity/components/health.component';
import { EnergyComponent } from '../game/components/energy.component';
import { MetricsComponent } from '../game/components/metrics.component';
import { CooldownComponent } from '../game/components/cooldown.component';
import { StunComponent } from '../game/components/stun.component';

export class UISpeedRenderer implements Renderer {

    private uiTiles: Map<string, string[]> = new Map(); // region -> tileIds[]
    private readonly uiDisplay: Display;
    private readonly MAX_SPEED = 12;  // Updated to 12 from 8
    private readonly MAX_HEALTH = 12;
    private readonly MAX_ENERGY = 12;
    private readonly MAX_OBJECTIVES = 12;  // Match other indicators
    private readonly GEAR_X = 0;  // Gear indicator position
    private readonly SPEED_START_X = 1;  // Speed bar starts 2 tiles in
    private readonly ENERGY_START_X = 15;  // Where speed ends
    private readonly HEALTH_START_X = 29;  // Move health further right
    private readonly TIME_X = 55;  // Position for current time display
    private readonly BEST_TIME_X = 65;  // Position for best time display
    private readonly OBJECTIVES_START_X = 43;  // After health indicator
    private readonly LOCKED_X = 80;  // Position for locked indicator
    private readonly TURBO_X = 88;   // New position (3 positions after LOCKED)
    private readonly REVERSE_X = 86;  // 6 positions after LOCKED_X (80)
    private readonly STUNNED_X = 69;  // Previously 73, moved left to avoid overlap with LOCKED (80)

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
    private readonly ENERGY_COLORS = [
        '#00ffff88',  // Bright cyan
        '#00eeff88',
        '#00ddff88',
        '#00ccff88',
        '#00bbff88',
        '#00aaff88',
        '#0099ff88',
        '#0088ff88',
        '#0077ffaa',
        '#0066ffaa',
        '#0055ffcc',
        '#0044ffcc'   // Deep blue with higher opacity
    ];
    private readonly OBJECTIVES_COLORS = [
        '#00ff0088',  // Light green
        '#00ee0088',
        '#00dd0088',
        '#00cc0088',
        '#00bb0088',
        '#00aa0088',
        '#009900aa',
        '#008800aa',
        '#007700cc',
        '#006600cc',
        '#005500cc',
        '#004400cc'   // Deep green with higher opacity
    ];
    private readonly displayCanvas: HTMLCanvasElement;

    constructor(
        private readonly player: Entity
    ) {
        this.uiDisplay = new Display({
            elementId: 'ui-overlay',
            cellWidth: 10,
            cellHeight: 20,
            viewportWidth: 106, // 1060/10 = 106 cells for UI width
            viewportHeight: 2,  // 2 rows for UI height
            worldWidth: 106,
            worldHeight: 2
        });

        // Store reference to the actual display canvas
        this.displayCanvas = document.getElementById('ui-overlay') as HTMLCanvasElement;
        if (!this.displayCanvas) {
            throw new Error('UI overlay canvas not found');
        }

        // Position UI canvas absolutely
        this.displayCanvas.style.position = 'absolute';
        this.displayCanvas.style.bottom = '20px';
        this.displayCanvas.style.left = '0';
        this.displayCanvas.style.pointerEvents = 'none';
        this.displayCanvas.style.zIndex = '100';

        this.initializeUI();
    }

    public hide(): void {
        logger.warn("Hiding UI speed renderer");
        this.displayCanvas.style.display = 'none';
    }

    public show(): void {
        logger.warn("Showing UI speed renderer");
        this.displayCanvas.style.display = 'block';
    }

    private initializeUI(): void {
        // Create black background for both rows with top walls
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < this.uiDisplay.getViewportWidth(); x++) {
                const tileId = this.uiDisplay.createTile(
                    x,
                    y,
                    ' ',
                    '#FFFFFFFF',
                    '#000000FF',
                    1000,
                    // {
                    //     walls: y === 0 ? [true, false] : [false, false],  // Only top row gets north wall
                    //     wallColors: y === 0 ? ['#FFFFFFFF', null] : [null, null]  // Semi-transparent white for north wall
                    // }
                );
                this.uiTiles.set(`bg_${x}_${y}`, [tileId]);
            }
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

        // Create health indicator tiles only if health component exists
        if (this.player.hasComponent('health')) {
            // Create health indicator tiles
            for (let i = 0; i < this.MAX_HEALTH; i++) {
                const healthTileId = this.uiDisplay.createTile(
                    this.HEALTH_START_X + i,
                    0,
                    ' ',
                    '#FFFFFFFF',
                    '#00000000',
                    1001,
                    // {
                    //     walls: [true, false],
                    //     wallColors: ['#FFFFFF88', null]
                    // }
                );
                this.uiTiles.set(`health_${i}`, [healthTileId]);
            }

            // Add health/integrity label
            const healthLabelTileIds = this.uiDisplay.createString(
                this.HEALTH_START_X,
                1,
                'integrity',
                1001,
                { fontFamily: 'monospace' }
            );
            this.uiTiles.set('health_label', healthLabelTileIds);
        }

        // Create energy indicator tiles
        for (let i = 0; i < this.MAX_ENERGY; i++) {
            const energyTileId = this.uiDisplay.createTile(
                this.ENERGY_START_X + i,
                0,
                ' ',
                '#FFFFFFFF',
                '#00000000',
                1001,
                // {
                    // walls: [true, false],
                    // wallColors: ['#FFFFFF88', null]
                // }
            );
            this.uiTiles.set(`energy_${i}`, [energyTileId]);
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
                    // walls: [true, false],
                    // wallColors: ['#FFFFFF88', null]
                }
            );
            this.uiTiles.set(`speed_${i}`, [speedTileId]);
        }

        // Create objectives indicator tiles
        for (let i = 0; i < this.MAX_OBJECTIVES; i++) {
            const objectiveTileId = this.uiDisplay.createTile(
                this.OBJECTIVES_START_X + i,
                0,
                ' ',
                '#FFFFFFFF',
                '#00000000',
                1001
            );
            this.uiTiles.set(`objective_${i}`, [objectiveTileId]);
        }

        // Add objectives label
        const objectivesLabelTileIds = this.uiDisplay.createString(
            this.OBJECTIVES_START_X,
            1,
            'objectives',
            1001,
            { fontFamily: 'monospace' }
        );
        this.uiTiles.set('objectives_label', objectivesLabelTileIds);

        // Update label positions
        const speedLabelTileIds = this.uiDisplay.createString(
            this.SPEED_START_X,
            1,
            'velocity',
            1001,
            { fontFamily: 'monospace' }
        );
        this.uiTiles.set('speed_label', speedLabelTileIds);

        const energyLabelTileIds = this.uiDisplay.createString(
            this.ENERGY_START_X,
            1,
            'energy',
            1001,
            { fontFamily: 'monospace' }
        );
        this.uiTiles.set('energy_label', energyLabelTileIds);

        this.updateSpeedIndicator();
        this.updateEnergyIndicator();
        this.updateHealthIndicator();
        this.updateObjectivesIndicator();
    }

    private updateSpeedIndicator(): void {
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const magnitude = inertia?.magnitude ?? 0;

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

        // Update turbo indicator based on current turbo component state
        this.updateTurboIndicator(this.player.hasComponent('turbo'));
    }

    private updateEnergyIndicator(): void {
        const energy = this.player.getComponent('energy') as EnergyComponent;
        const currentEnergy = energy?.energy ?? 0;
        const normalizedEnergy = (currentEnergy / energy.maxEnergy);

        logger.info(`currentEnergy: ${currentEnergy} maxEnergy: ${energy.maxEnergy} normalizedEnergy: ${normalizedEnergy}`);

        for (let i = 0; i < 10; i++) {
            const energyTileIds = this.uiTiles.get(`energy_${i}`);
            if (energyTileIds) {
                for (const energyTileId of energyTileIds) {
                    this.uiDisplay.updateTile(energyTileId, {
                        bg: i/10 < normalizedEnergy ? this.ENERGY_COLORS[i] : '#00000000'
                    });
                }
            }
        }
    }

    private updateHealthIndicator(): void {
        // If no health component, return early
        if (!this.player.hasComponent('health')) {
            return;
        }

        const health = this.player.getComponent('health') as HealthComponent;
        const currentHealth = health?.health ?? 0;
        const maxHealth = health?.maxHealth ?? this.MAX_HEALTH;
        
        // Calculate how many tiles to fill based on current health percentage
        const healthPercentage = currentHealth / maxHealth;
        const tilesToFill = Math.ceil(healthPercentage * this.MAX_HEALTH);

        for (let i = 0; i < this.MAX_HEALTH; i++) {
            const healthTileIds = this.uiTiles.get(`health_${i}`);
            if (healthTileIds) {
                for (const healthTileId of healthTileIds) {
                    // Fill tiles proportionally to health percentage
                    this.uiDisplay.updateTile(healthTileId, {
                        bg: i < tilesToFill ? this.HEALTH_COLORS[i] : '#00000000'
                    });
                }
            }
        }
    }

    private updateObjectivesIndicator(): void {
        const metrics = this.player.getComponent('metrics') as MetricsComponent;
        
        // Show or hide the objectives label based on metrics presence
        const labelTileIds = this.uiTiles.get('objectives_label');
        if (labelTileIds) {
            for (const tileId of labelTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: metrics ? '#FFFFFFFF' : '#00000000'  // Show if metrics exists, hide if not
                });
            }
        }

        if (!metrics) {
            // Clear all objective tiles if no metrics
            for (let i = 0; i < this.MAX_OBJECTIVES; i++) {
                const objectiveTileIds = this.uiTiles.get(`objective_${i}`);
                if (objectiveTileIds) {
                    for (const objectiveTileId of objectiveTileIds) {
                        this.uiDisplay.updateTile(objectiveTileId, {
                            bg: '#00000000'
                        });
                    }
                }
            }
            return;
        }

        if(metrics.maxObjectivesThisLevel != 0) {
        // First create dark green background for total possible objectives
            for (let i = 0; i < metrics.maxObjectivesThisLevel; i++) {
                const objectiveTileIds = this.uiTiles.get(`objective_${i}`);
                if (objectiveTileIds) {
                    for (const objectiveTileId of objectiveTileIds) {
                        this.uiDisplay.updateTile(objectiveTileId, {
                            bg: '#00440088'  // Dark green background for total possible
                        });
                    }
                }
            }
        }
        

        // Then fill in bright green for current level objectives
        for (let i = 0; i < metrics.objectivesThisLevel; i++) {
            const objectiveTileIds = this.uiTiles.get(`objective_${i}`);
            if (objectiveTileIds) {
                for (const objectiveTileId of objectiveTileIds) {
                    this.uiDisplay.updateTile(objectiveTileId, {
                        bg: this.OBJECTIVES_COLORS[i]  // Bright green for collected
                    });
                }
            }
        }

        // Clear any remaining tiles beyond maxObjectives
        for (let i = metrics.maxObjectivesThisLevel; i < this.MAX_OBJECTIVES; i++) {
            const objectiveTileIds = this.uiTiles.get(`objective_${i}`);
            if (objectiveTileIds) {
                for (const objectiveTileId of objectiveTileIds) {
                    this.uiDisplay.updateTile(objectiveTileId, {
                        bg: '#00000000'  // Clear any tiles beyond max
                    });
                }
            }
        }
    }

    private updateTimeDisplay(): void {
        const timestamp = this.player.getComponent('timestamp') as TimestampComponent;

        // Remove old time tiles
        const timeTileIds = this.uiTiles.get('time');
        if (timeTileIds) {
            this.uiDisplay.removeTiles(timeTileIds);
        }

        const bestTimeTileIds = this.uiTiles.get('best_time');
        if (bestTimeTileIds) {
            this.uiDisplay.removeTiles(bestTimeTileIds);
        }

        // Create or update time displays if we have a timestamp component
        if (timestamp) {
            // Create labels if they don't exist yet
            if (!this.uiTiles.has('current_label')) {
                const currentLabelTileIds = this.uiDisplay.createString(
                    this.TIME_X,
                    1,
                    'current',
                    1001,
                    { fontFamily: 'monospace' }
                );
                this.uiTiles.set('current_label', currentLabelTileIds);

                const bestLabelTileIds = this.uiDisplay.createString(
                    this.BEST_TIME_X,
                    1,
                    'best',
                    1001,
                    { fontFamily: 'monospace' }
                );
                this.uiTiles.set('best_label', bestLabelTileIds);
            }

            // Update current time - use finalTime if available, otherwise show running time
            const elapsed = timestamp.finalTime 
                ? (timestamp.finalTime) / 1000
                : (performance.now() - timestamp.start) / 1000;
            
            const newTimeTileIds = this.uiDisplay.createString(
                this.TIME_X, 
                0, 
                `${elapsed.toFixed(2)}s`, 
                1001
            );
            this.uiTiles.set('time', newTimeTileIds);

            for(const tileId of newTimeTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#11FF11FF',
                    bg: '#00000000'
                });
            }

            // Show best time if it exists
            const bestTime = timestamp.bestTime;
            if (bestTime !== null) {
                const bestTimeStr = (bestTime / 1000).toFixed(2);
                const newBestTimeTileIds = this.uiDisplay.createString(
                    this.BEST_TIME_X,
                    0,
                    `${bestTimeStr}s`,
                    1001
                );
                this.uiTiles.set('best_time', newBestTimeTileIds);

                for(const tileId of newBestTimeTileIds) {
                    this.uiDisplay.updateTile(tileId, {
                        fg: '#FFD700FF', // Gold color for best time
                        bg: '#00000000'
                    });
                }
            }
        } else {
            // Remove labels and times if no timestamp component
            ['current_label', 'best_label', 'time', 'best_time'].forEach(key => {
                const tileIds = this.uiTiles.get(key);
                if (tileIds) {
                    this.uiDisplay.removeTiles(tileIds);
                    this.uiTiles.delete(key);
                }
            });
        }
    }

    private updateLockedIndicator(isLocked: boolean): void {
        // logger.info(`Updating locked indicator. isLocked: ${isLocked}`);
        
        // Remove existing locked tiles if they exist
        const lockedTileIds = this.uiTiles.get('locked');
        if (lockedTileIds) {
            // logger.info('Removing existing locked tiles');
            this.uiDisplay.removeTiles(lockedTileIds);
            this.uiTiles.delete('locked');
        }

        // If locked, create new tiles
        if (isLocked) {
            // logger.info('Creating new locked tiles');
            const newLockedTileIds = this.uiDisplay.createString(
                this.LOCKED_X,
                0,
                'LOCKED',
                1001,
                { 
                    fontFamily: 'monospace',
                    backgroundColor: '#FF194DFF'
                }
            );
            this.uiTiles.set('locked', newLockedTileIds);

            // Set white text color
            for (const tileId of newLockedTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#FFFFFFFF'
                });
            }
        }
    }

    private updateTurboIndicator(isTurbo: boolean): void {
        // Remove existing turbo tiles if they exist
        const turboTileIds = this.uiTiles.get('turbo');
        if (turboTileIds) {
            this.uiDisplay.removeTiles(turboTileIds);
            this.uiTiles.delete('turbo');
        }

        // Check inertia magnitude
        const inertia = this.player.getComponent('inertia') as InertiaComponent;
        const magnitude = inertia?.magnitude ?? 0;
        const hasTurboSpeed = magnitude >= 2;

        // Show TURBO if we have the component or sufficient speed
        if (isTurbo || hasTurboSpeed) {
            const newTurboTileIds = this.uiDisplay.createString(
                this.TURBO_X,
                0,              // Same row as LOCKED
                'TURBO',
                1001,
                { 
                    fontFamily: 'monospace',
                    backgroundColor: isTurbo ? '#0088FFFF' : '#000000FF'  // Blue bg when component active, black when just speed
                }
            );
            this.uiTiles.set('turbo', newTurboTileIds);

            // Set text color - white when component active, blue when just speed
            for (const tileId of newTurboTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: isTurbo ? '#FFFFFFFF' : '#0088FFFF'
                });
            }
        }
    }

    private updateBrakeIndicator(isBraking: boolean): void {
        // Remove existing brake tiles if they exist
        // Remove existing brake tiles if they exist
        const brakeTileIds = this.uiTiles.get('brake');
        if (brakeTileIds) {
            this.uiDisplay.removeTiles(brakeTileIds);
            this.uiTiles.delete('brake');
        }

        // If braking, create new tiles
        if (isBraking) {
            const newBrakeTileIds = this.uiDisplay.createString(
                this.LOCKED_X,  // Use same X position as LOCKED
                1,              // One row below LOCKED
                'BRAKE',
                1001,
                { 
                    fontFamily: 'monospace',
                    backgroundColor: '#F76505'
                }
            );
            this.uiTiles.set('brake', newBrakeTileIds);

            // Set white text color
            for (const tileId of newBrakeTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#FFFFFFFF'
                });
            }
        }
    }

    private updateReverseIndicator(isReversing: boolean): void {

        // logger.info(`Updating reverse indicator. isReversing: ${isReversing}`);

        // If reversing, create new tiles
        if (isReversing) {
            const newReverseTileIds = this.uiDisplay.createString(
                this.REVERSE_X,  // To the right of BRAKE
                1,               // Same row as BRAKE
                'REVERSE',
                1001,
                { 
                    fontFamily: 'monospace',
                    backgroundColor: '#FFC505FF'
                }
            );
            this.uiTiles.set('reverse', newReverseTileIds);

            // Set white text color
            for (const tileId of newReverseTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#FFFFFFFF'
                });
            }
        } else {
            // Remove the tiles if they exist before deleting the map entry
            const reverseTileIds = this.uiTiles.get('reverse');
            if (reverseTileIds) {
                this.uiDisplay.removeTiles(reverseTileIds);
                this.uiTiles.delete('reverse');
            }
        }
    }

    private updateStunnedIndicator(): void {
        // Remove existing stunned tiles and text
        const stunnedTileIds = this.uiTiles.get('stunned');
        if (stunnedTileIds) {
            this.uiDisplay.removeTiles(stunnedTileIds);
            this.uiTiles.delete('stunned');
        }

        const textTileIds = this.uiTiles.get('stunned_text');
        if (textTileIds) {
            this.uiDisplay.removeTiles(textTileIds);
            this.uiTiles.delete('stunned_text');
        }

        // Check for stun cooldown
        const cooldown = this.player.getComponent('cooldown') as CooldownComponent;
        const stunCooldown = cooldown?.getCooldown('stun');
        
        const stunComponent = this.player.getComponent('stun') as StunComponent;

        if (stunComponent && stunCooldown) {
            // Create 10 empty tiles for the stun bar
            const newStunnedTileIds = [];
            for (let i = 0; i < 10; i++) {
                const tileId = this.uiDisplay.createTile(
                    this.STUNNED_X + i,
                    0,
                    ' ',
                    '#FFFFFFFF',
                    '#FFC505FF',
                    1001,
                    { fontFamily: 'monospace' }
                );
                newStunnedTileIds.push(tileId);
            }
            this.uiTiles.set('stunned', newStunnedTileIds);

            // Calculate progress (0 to 1, where 1 means stun just started)
            const progress = stunCooldown.current / stunCooldown.base;

            // Update each tile's background based on progress
            newStunnedTileIds.forEach((tileId, index) => {
                // Each tile represents 10% of the bar
                const tileThreshold = (index + 1) / 10;
                
                this.uiDisplay.updateTile(tileId, {
                    bg: progress > tileThreshold ? '#FFC505FF' : '#000000FF'  // Red if stun active, black if expired
                });
            });

            // Add "STUN" text overlay on top of the bar
            const textTileIds = this.uiDisplay.createString(
                this.STUNNED_X + 3,  // Center "STUN" in the 10-tile bar
                0,
                'STUN',
                1002,  // Higher z-index to appear over the bar
                { 
                    fontFamily: 'monospace',
                    backgroundColor: '#00000000'  // Transparent background
                }
            );
            this.uiTiles.set('stunned_text', textTileIds);

            // Set white text color with transparent background
            for (const tileId of textTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#FFFFFFFF',
                    bg: '#00000000'  // Transparent background
                });
            }
        }
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
            } else if (componentType === 'energy') {
                this.updateEnergyIndicator();
            } else if (componentType === 'metrics') {
                this.updateObjectivesIndicator();
            } else if (componentType === 'locked') {
                this.updateLockedIndicator(true);
            } else if (componentType === 'brake') {
                this.updateBrakeIndicator(true);
            } else if (componentType === 'reverse') {
                this.updateReverseIndicator(true);
            } else if (componentType === 'turbo') {
                this.updateTurboIndicator(true);
            } else if (componentType === 'cooldown') {
                this.updateStunnedIndicator();
            }
        }
    }
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        // logger.info(`handleComponentRemoved: ${componentType}`);
        if (entity === this.player) {
            if (componentType === 'inertia') {
                this.updateSpeedIndicator();
            } else if (componentType === 'timestamp') {
                // this.updateTimeDisplay();
            } else if (componentType === 'health') {
                this.updateHealthIndicator();
            } else if (componentType === 'energy') {
                this.updateEnergyIndicator();
            } else if (componentType === 'metrics') {
                this.updateObjectivesIndicator();
            } else if (componentType === 'locked') {
                this.updateLockedIndicator(false);
            } else if (componentType === 'brake') {
                this.updateBrakeIndicator(false);
            } else if (componentType === 'reverse') {
                this.updateReverseIndicator(false);
            } else if (componentType === 'turbo') {
                this.updateTurboIndicator(false);
            } else if (componentType === 'cooldown') {
                this.updateStunnedIndicator();
            }
        }
    }

    public lightUpDashboard(): void {
        // Speed indicator - full speed
        for (let i = 0; i < this.MAX_SPEED; i++) {
            const speedTileIds = this.uiTiles.get(`speed_${i}`);
            if (speedTileIds) {
                for (const speedTileId of speedTileIds) {
                    this.uiDisplay.updateTile(speedTileId, {
                        bg: this.SPEED_COLORS[i]
                    });
                }
            }
        }

        // Energy indicator - full energy
        for (let i = 0; i < this.MAX_ENERGY; i++) {
            const energyTileIds = this.uiTiles.get(`energy_${i}`);
            if (energyTileIds) {
                for (const energyTileId of energyTileIds) {
                    this.uiDisplay.updateTile(energyTileId, {
                        bg: this.ENERGY_COLORS[i]
                    });
                }
            }
        }

        // Health indicator - full health
        for (let i = 0; i < this.MAX_HEALTH; i++) {
            const healthTileIds = this.uiTiles.get(`health_${i}`);
            if (healthTileIds) {
                for (const healthTileId of healthTileIds) {
                    this.uiDisplay.updateTile(healthTileId, {
                        bg: this.HEALTH_COLORS[i]
                    });
                }
            }
        }

        // Objectives indicator - all objectives
        for (let i = 0; i < this.MAX_OBJECTIVES; i++) {
            const objectiveTileIds = this.uiTiles.get(`objective_${i}`);
            if (objectiveTileIds) {
                for (const objectiveTileId of objectiveTileIds) {
                    this.uiDisplay.updateTile(objectiveTileId, {
                        bg: this.OBJECTIVES_COLORS[i]
                    });
                }
            }
        }

        // Light up all labels with bright colors
        const labels = [
            { text: 'velocity', x: this.SPEED_START_X, color: '#FFD700FF' },  // Gold
            { text: 'energy', x: this.ENERGY_START_X, color: '#00FFFFFF' },   // Cyan
            { text: 'integrity', x: this.HEALTH_START_X, color: '#FF0000FF' }, // Red
            { text: 'objectives', x: this.OBJECTIVES_START_X, color: '#00FF00FF' } // Green
        ];

        labels.forEach(label => {
            // Remove existing label if it exists
            const existingLabelIds = this.uiTiles.get(`${label.text}_label`);
            if (existingLabelIds) {
                this.uiDisplay.removeTiles(existingLabelIds);
            }

            // Create new bright label
            const labelTileIds = this.uiDisplay.createString(
                label.x,
                1,
                label.text,
                1001,
                { fontFamily: 'monospace' }
            );
            this.uiTiles.set(`${label.text}_label`, labelTileIds);

            // Set bright color
            for (const tileId of labelTileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: label.color,
                    bg: '#00000000'
                });
            }
        });

        // Show all status indicators with bright colors
        const indicators = [
            { name: 'LOCKED', x: this.LOCKED_X, bg: '#FF194DFF' },
            { name: 'TURBO', x: this.TURBO_X, bg: '#0088FFFF' },
            { name: 'BRAKE', x: this.LOCKED_X, y: 1, bg: '#F76505FF' },
            { name: 'REVERSE', x: this.REVERSE_X, y: 1, bg: '#FFC505FF' },
            { name: 'STUN', x: this.STUNNED_X + 3, y: 0, bg: '#FFC505FF' }
        ];

        indicators.forEach(indicator => {
            const tileIds = this.uiDisplay.createString(
                indicator.x,
                indicator.y || 0,
                indicator.name,
                1001,
                { 
                    fontFamily: 'monospace',
                    backgroundColor: indicator.bg
                }
            );
            this.uiTiles.set(indicator.name.toLowerCase(), tileIds);

            for (const tileId of tileIds) {
                this.uiDisplay.updateTile(tileId, {
                    fg: '#FFFFFFFF'
                });
            }
        });

        // Show stun bar fully lit with maximum brightness
        const stunnedTileIds = [];
        for (let i = 0; i < 10; i++) {
            const tileId = this.uiDisplay.createTile(
                this.STUNNED_X + i,
                0,
                ' ',
                '#FFFFFFFF',
                '#FFC505FF',
                1001
            );
            stunnedTileIds.push(tileId);
        }
        this.uiTiles.set('stunned', stunnedTileIds);

        // Add STUN text with maximum brightness
        const textTileIds = this.uiDisplay.createString(
            this.STUNNED_X + 3,
            0,
            'STUN',
            1002,
            { 
                fontFamily: 'monospace',
                backgroundColor: '#00000000'
            }
        );
        this.uiTiles.set('stunned_text', textTileIds);
        for (const tileId of textTileIds) {
            this.uiDisplay.updateTile(tileId, {
                fg: '#FFFFFF',
                bg: '#00000000'
            });
        }
    }

    public resetDashboard(): void {
        // Remove all status indicators including stun-related ones
        ['locked', 'turbo', 'brake', 'reverse', 'stunned', 'stunned_text'].forEach(key => {
            const tileIds = this.uiTiles.get(key);
            if (tileIds) {
                this.uiDisplay.removeTiles(tileIds);
                this.uiTiles.delete(key);
            }
        });

        // Reset all indicators to their current state
        this.updateSpeedIndicator();
        this.updateEnergyIndicator();
        this.updateHealthIndicator();
        this.updateObjectivesIndicator();
        // Remove updateStunnedIndicator() call since we want stun to be off

        // Check and update current component states
        if (this.player.hasComponent('locked')) {
            this.updateLockedIndicator(true);
        }
        if (this.player.hasComponent('brake')) {
            this.updateBrakeIndicator(true);
        }
        if (this.player.hasComponent('reverse')) {
            this.updateReverseIndicator(true);
        }
        if (this.player.hasComponent('turbo')) {
            this.updateTurboIndicator(true);
        }
    }
} 