import { Display } from "../../display/display";
import { FillDirection, Easing, TileId, BlendMode } from "../../display/types";
import { Component } from "../../entity/component";
import { BumpingComponent } from "../../entity/components/bumping-component";
import { VisionComponent } from "../../entity/components/vision-component";
import { Entity } from "../../entity/entity";
import { GameRenderer } from "../../render/test/game-renderer";
import { Point, Direction } from "../../types";
import { directionToRadians } from "../../util";
import { logger } from "../../util/logger";
import { World } from "../../world/world";
import { CooldownComponent } from "../components/cooldown.component";
import { EnemyAIComponent } from "../components/enemy-ai.component";
import { InertiaComponent } from "../components/inertia.component";
import { TurboComponent } from "../components/turbo.component";
import { TICK_MS } from "../constants";
import { MovementPredictor } from "../systems/movement-predictor";
import { SymbolComponent } from "../../entity/components/symbol-component";

export class RuntimeRenderer extends GameRenderer {
    private discoveredTiles: Set<string> = new Set();  // Store as "x,y" strings
    private bufferedMoveTiles: Map<string, string> = new Map(); // entityId -> tileId
    private movementPredictor: MovementPredictor;
    private speedIndicatorTiles: Map<string, string> = new Map(); // entityId -> tileId
    private targetingIndicators: Map<string, string> = new Map(); // entityId -> tileId

    constructor(display: Display, world: World) {
        super(world, display);
        this.movementPredictor = new MovementPredictor(world);

        // Initial visibility setup
        this.updateVisibility();

        // Subscribe to component modifications
        this.world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
            this.handleComponentModified(data.entity, data.componentType);
        });

        this.world.on('componentAdded', (data: { entity: Entity, componentType: string }) => {
            this.handleComponentAdded(data.entity, data.componentType);
        });

        // Subscribe to entity movement to update viewport
        // this.world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
        //     if (data.entity.hasComponent('player')) {
        //         // Update viewport to follow player
        //         this.display.setViewportPosition(data.to.x, data.to.y);
        //     }
        //     // return this.handleEntityMoved(data.entity, data.from, data.to);
        // });

        this.world.on('playerVisionUpdated', (data: { playerPos: Point, visibleLocations: Set<string> }) => {
            this.updateVisibility(data.playerPos);
        });
    }

    public updateVisibility(overridePosition?: Point): void {
        const player = this.world.getEntitiesWithComponent('player')[0];
        if (!player) return;

        const visionComponent = player.getComponent('vision') as VisionComponent;
        if (!visionComponent) return;

        const visionRadius = visionComponent.radius;
        const pos = overridePosition || player.getPosition();
        const worldSize = this.world.getSize();

        const mask = Array(worldSize.y).fill(0).map(() => Array(worldSize.x).fill(0));

        // Calculate currently visible tiles
        for (let y = Math.max(0, pos.y - visionRadius); y <= Math.min(worldSize.y - 1, pos.y + visionRadius); y++) {
            for (let x = Math.max(0, pos.x - visionRadius); x <= Math.min(worldSize.x - 1, pos.x + visionRadius); x++) {

                const isVisible = this.world.isLocationVisible({ x, y });
                if (isVisible) {
                    mask[y][x] = 1;  // Fully visible
                    this.discoveredTiles.add(`${x},${y}`);  // Mark as discovered
                } else {
                    mask[y][x] = 0;
                }
            }
        }

        // Add partially visible discovered tiles
        this.discoveredTiles.forEach(coord => {
            const [x, y] = coord.split(',').map(Number);
            if (mask[y][x] === 0) {  // If not currently visible
                mask[y][x] = 0.3;     // Partially visible
            }
        });

        this.display.setVisibilityMask(mask);
    }

    public handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (componentType === 'bufferedMove') {
            const tileId = this.bufferedMoveTiles.get(entity.getId());
            if (tileId) {
                this.display.removeTile(tileId);
                this.bufferedMoveTiles.delete(entity.getId());
            }
        }

        if (componentType === 'inertia') {
            const speedTileId = this.speedIndicatorTiles.get(entity.getId());
            if (speedTileId) {
                this.display.removeTile(speedTileId);
                this.speedIndicatorTiles.delete(entity.getId());
            }
        }

        if (componentType === 'stun') {
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                this.display.updateTile(tileId, {
                    bgPercent: 0.0,
                    fillDirection: FillDirection.TOP
                });
            }
        }

        if (componentType === 'locked') {
            const indicatorTileId = this.targetingIndicators.get(entity.getId());
            if (indicatorTileId) {
                this.display.removeTile(indicatorTileId);
                this.targetingIndicators.delete(entity.getId());
                
                // Remove the move callback from the entity's main tile
                const entityTileId = this.entityTiles.get(entity.getId());
                if (entityTileId) {
                    this.display.removeTileMoveCallback(entityTileId);
                }
            }
        }
    }

    public handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        const tileId = this.entityTiles.get(entity.getId());
        if (tileId) {
            const isPlayer = entity.hasComponent('player');
            const duration = isPlayer ? 0.1 : 0.5;

            this.display.addValueAnimation(tileId, {
                x: {
                    start: from.x,
                    end: to.x,
                    duration: duration,
                    easing: Easing.quadOut,
                    loop: false
                },
                y: {
                    start: from.y,
                    end: to.y,
                    duration: duration,
                    easing: Easing.quadOut,
                    loop: false
                }
            });

            if (isPlayer) {
                const inertia = entity.getComponent('inertia') as InertiaComponent;
                const turbo = entity.getComponent('turbo') as TurboComponent;

                if (inertia && inertia.magnitude >= 2) {
                    // Only use yellow color if turbo is active and working (not out of energy)
                    logger.warn(`turbo: ${turbo?.turnsSinceEngaged} ${turbo?.turnsSinceEngaged > 0}`);
                    const baseColor = turbo && turbo.turnsSinceEngaged > 0 ? '#e8e7a9' : '#005577';

                    const trailTileId = this.display.createTile(from.x, from.y, ' ', '#FFFFFFFF', baseColor + '44', 300, {
                        bgPercent: 1,
                        blendMode: BlendMode.Screen
                    });

                    this.display.addColorAnimation(trailTileId, {
                        bg: {
                            start: baseColor + 'aa',
                            end: baseColor + '00',
                            duration: 6,
                            easing: Easing.quadOut,
                            loop: false,
                            removeOnComplete: true
                        }
                    });

                    // we want this to happen during moments of traction
                    // traction means magnitude about 3, below 5, and perpandicular movement
                    const dx = to.x - from.x;
                    const dy = to.y - from.y;

                    const isInertiaPerpendicularToMovement =
                        (inertia.direction === Direction.North && Math.abs(dx) > 0) ||
                        (inertia.direction === Direction.South && Math.abs(dx) > 0) ||
                        (inertia.direction === Direction.East && Math.abs(dy) > 0) ||
                        (inertia.direction === Direction.West && Math.abs(dy) > 0);

                    if (inertia.magnitude >= 3 && inertia.magnitude < 8 && isInertiaPerpendicularToMovement) {
                        // Get base angle from inertia direction
                        let inertiaAngle = 0;
                        switch (inertia.direction) {
                            case Direction.North: inertiaAngle = -Math.PI/2; break;
                            case Direction.South: inertiaAngle = Math.PI/2; break;
                            case Direction.East: inertiaAngle = 0; break;
                            case Direction.West: inertiaAngle = Math.PI; break;
                        }

                        // Determine movement angle based on dx/dy
                        const moveAngle = Math.atan2(dy, dx);
                        
                        // Average the angles to get the diagonal
                        const angle = (inertiaAngle + moveAngle) / 2;

                        const tileId = this.display.createTile(from.x, from.y, '=', '#fcb103ff', '#00000000', 300, {
                            rotation: angle,
                            scaleSymbolX: 2.0,
                        });

                        this.display.addColorAnimation(tileId, {
                            fg: {
                                start: '#fcb103ff',
                                end: '#C8BDBD77',
                                duration: 1.0,
                                easing: Easing.quadOut,
                                loop: false
                            }
                            }
                        );

                        // Calculate smoke positions based on movement direction
                        // let smokePos1: Point, smokePos2: Point;
                        // if (Math.abs(dx) > 0) {  // Moving horizontally
                        //     smokePos1 = { x: from.x+1, y: from.y - 1 }; // above
                        //     smokePos2 = { x: from.x-1, y: from.y + 1 }; // below
                        // } else {  // Moving vertically
                        //     smokePos1 = { x: from.x - 1, y: from.y+1 }; // left
                        //     smokePos2 = { x: from.x + 1, y: from.y-1 }; // right
                        // }

                        // this.makeSmokeTileAt(smokePos1);
                        // this.makeSmokeTileAt(smokePos2);
                    }
                }
            }

            return true;
        }
        return false;
    }

    public handleComponentModified(entity: Entity, componentType: string): void {
        if (componentType === 'bufferedMove' || componentType === 'inertia') {
            const prediction = this.movementPredictor.predictMove(entity);
            const tileId = this.bufferedMoveTiles.get(entity.getId());
            const speedTileId = this.speedIndicatorTiles.get(entity.getId());

            // Update speed indicator if it exists
            if (speedTileId && prediction.finalInertia) {
                const finalAction = prediction.actions[prediction.actions.length - 1];
                const pos = finalAction?.data.to ?? entity.getPosition();

                this.display.moveTile(speedTileId, pos.x, pos.y);
                this.display.updateTile(speedTileId, {
                    char: prediction.finalInertia.magnitude.toString(),
                });
            }

            if (tileId) {
                if (prediction.actions.length > 0) {
                    // Get the final destination from the last action
                    const finalAction = prediction.actions[prediction.actions.length - 1];
                    this.display.moveTile(tileId, finalAction.data.to.x, finalAction.data.to.y);

                } else {
                    // If no actions, remove the destination tile
                    this.display.removeTile(tileId);
                    this.bufferedMoveTiles.delete(entity.getId());
                }
            }
        }

        if (componentType === 'turbo') {
            const turbo = entity.getComponent('turbo') as TurboComponent;
            if (turbo.turnsSinceEngaged < 4 && turbo.turnsSinceEngaged > 0) {
                this.makeTurboSmoke(entity);
            }
        }

        if (componentType === 'enemyAI') {
            const ai = entity.getComponent('enemyAI') as EnemyAIComponent;

            if (ai.turnsLocked > 0) {
                const tileId = this.entityTiles.get(entity.getId());
                if (tileId) {
                    this.display.updateTile(tileId, {
                        bg: '#990000FF',
                    });
                }
            }

        }

        if (componentType === 'cooldown') {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            const tileId = this.entityTiles.get(entity.getId());
            const player = entity.hasComponent('player');

            if (!tileId) {
                return;
            }

            if (cooldowns) {
                // Handle move cooldown

                // Handle stun cooldown (takes precedence over move cooldown)
                const stunState = cooldowns.getCooldown('stun');
                if (stunState && stunState.current > 0 && stunState.ready) {
                    logger.info(`stunState.current: ${stunState.current} base: ${stunState.base} ==? ${stunState.current === stunState.base}`);
                    if (stunState.current === stunState.base) {
                        this.display.updateTile(tileId, {
                            bg: '#770505',
                            fillDirection: FillDirection.TOP
                        });
                    }

                    this.display.addValueAnimation(tileId, {
                        bgPercent: {
                            start: 1.0,
                            end: 0.0,
                            duration: stunState.base * TICK_MS / 1000, // Convert ms to seconds
                            easing: Easing.linear,
                            loop: false,
                        }
                    });

                    // set ready to false
                    cooldowns.setCooldown('stun', stunState.base, stunState.current, false);
                    entity.setComponent(cooldowns);
                }

                const toggleState = cooldowns.getCooldown('toggle');
                if (toggleState) {
                    const percent = 1 - (toggleState.current / toggleState.base);

                    this.display.updateTile(tileId, {
                        bgPercent: percent,
                        fillDirection: FillDirection.BOTTOM
                    });
                }
            }
        }

        if (componentType === 'symbol') {
            const tileId = this.entityTiles.get(entity.getId());
            const symbol = entity.getComponent('symbol') as SymbolComponent;
            if (tileId && symbol) {
                // Only update properties that are explicitly set on the symbol
                const updates: any = {};
                
                if (symbol.char !== undefined) updates.char = symbol.char;
                if (symbol.foreground !== undefined) updates.fg = symbol.foreground;
                if (symbol.background !== undefined) updates.bg = symbol.background;
                if (symbol.rotation !== undefined) updates.rotation = symbol.rotation;
                if (symbol.scaleSymbolX !== undefined) updates.scaleSymbolX = symbol.scaleSymbolX;
                if (symbol.scaleSymbolY !== undefined) updates.scaleSymbolY = symbol.scaleSymbolY;
                if (symbol.offsetSymbolX !== undefined) updates.offsetSymbolX = symbol.offsetSymbolX;
                if (symbol.offsetSymbolY !== undefined) updates.offsetSymbolY = symbol.offsetSymbolY;
                if (symbol.zIndex !== undefined) updates.zIndex = symbol.zIndex;
                if (symbol.alwaysRenderIfExplored !== undefined) updates.alwaysRenderIfExplored = symbol.alwaysRenderIfExplored;
                if (symbol.lockRotationToFacing !== undefined) updates.lockRotationToFacing = symbol.lockRotationToFacing;

                // Only call updateTile if we have properties to update
                if (Object.keys(updates).length > 0) {
                    this.display.updateTile(tileId, updates);
                }
            }
        }
    }

    public handleComponentAdded(entity: Entity, componentType: string): void {

        // Handle bumping animation
        logger.info(`Component added: ${entity.getId()} - ${componentType}`);
        if (componentType === 'bumping') {
            const bump = entity.getComponent('bumping') as BumpingComponent;
            const tileId = this.entityTiles.get(entity.getId());

            if (bump && tileId) {
                const pos = entity.getPosition();
                const bumpDistance = 0.3;

                const targetPos = {
                    x: pos.x + (bump.direction.x * bumpDistance),
                    y: pos.y + (bump.direction.y * bumpDistance)
                };

                // Forward animation
                const forward = {
                    start: pos.x,
                    end: targetPos.x,
                    duration: bump.duration / 2,
                    easing: Easing.quadOut,
                    loop: false
                };

                // Return animation
                const back = {
                    start: targetPos.x,
                    end: pos.x,
                    duration: bump.duration / 2,
                    easing: Easing.quadOut,
                    loop: false
                };

                this.display.addValueAnimation(tileId, {
                    x: {
                        ...forward,
                        next: back
                    },
                    y: {
                        start: pos.y,
                        end: targetPos.y,
                        duration: bump.duration / 2,
                        easing: Easing.quadOut,
                        loop: false,
                        next: {
                            start: targetPos.y,
                            end: pos.y,
                            duration: bump.duration / 2,
                            easing: Easing.quadOut,
                            loop: false
                        }
                    }
                });

                // Remove the bumping component after animation completes
                setTimeout(() => {
                    entity.removeComponent('bumping');
                }, bump.duration * 1000);
            }
        }
        // if (componentType === 'inertia') {
        //     const inertia = entity.getComponent('inertia') as InertiaComponent;
        //     const pos = entity.getPosition();

        //     // Create speed indicator tile
        //     const speedTileId = this.display.createTile(
        //         pos.x,
        //         pos.y,
        //         inertia.magnitude.toString(),
        //         '#FFFFFFFF',  // White text
        //         '#00000000',  // Transparent background
        //         1000,         // Above most other tiles
        //         {
        //             offsetSymbolX: 0.3,    // Offset to bottom right corner
        //             offsetSymbolY: 0.3,
        //             scaleSymbolX: 0.6,  // Make it smaller
        //             scaleSymbolY: 0.6
        //         }
        //     );

        //     this.speedIndicatorTiles.set(entity.getId(), speedTileId);
        // }
        // if(componentType === 'bufferedMove') {
        //     const tileId = this.createDestinationTile(entity);

        //     if(tileId) {
        //         this.bufferedMoveTiles.set(entity.getId(), tileId);
        //     }
        // } 

        // if(componentType === 'turbo') {
        //     this.makeTurboSmoke(entity);
        // }

        if (componentType === 'locked' && entity.hasComponent('player')) {
            const pos = entity.getPosition();
            const tileId = this.display.createTile(
                pos.x,
                pos.y,
                '⛶',
                '#FFFFFFFF',
                '#00000000',
                1000,
                {
                    // offsetSymbolY: -0.5, // Position above the player
                    scaleSymbolX: 1.4,
                    scaleSymbolY: 1.4
                }
            );
            
            // Store the indicator tile ID
            this.targetingIndicators.set(entity.getId(), tileId);

            const playerTileId = this.entityTiles.get(entity.getId())!;

            this.display.linkTiles(playerTileId, tileId);
            
            // Set up a move callback to update the indicator position
            // this.display.setTileMoveCallback(this.entityTiles.get(entity.getId())!, (_, x, y) => {
            //     this.display.moveTile(tileId, x, y);
            // });
        }
    }

    private makeTurboSmoke(entity: Entity): void {
        const pos = entity.getPosition();
        const inertia = entity.getComponent('inertia') as InertiaComponent;
        const direction = inertia.direction;

        // Calculate offset positions perpendicular to movement direction
        let leftOffset: Point;
        let rightOffset: Point;

        let behindOffset: Point;

        switch (direction) {
            case Direction.North:
                behindOffset = { x: 0, y: 1 };
                leftOffset = { x: -1, y: 0 };
                rightOffset = { x: 1, y: 0 };
                break;
            case Direction.South:
                leftOffset = { x: -1, y: 0 };
                rightOffset = { x: 1, y: 0 };
                behindOffset = { x: 0, y: -1 };
                break;
            case Direction.East:
                leftOffset = { x: 0, y: -1 };
                rightOffset = { x: 0, y: 1 };
                behindOffset = { x: -1, y: 0 };
                break;
            case Direction.West:
                leftOffset = { x: 0, y: -1 };
                rightOffset = { x: 0, y: 1 };
                behindOffset = { x: 1, y: 0 };
                break;
            case Direction.None:
                behindOffset = { x: 0, y: 0 };
                leftOffset = { x: 0, y: 0 };
                rightOffset = { x: 0, y: 0 };
                break;
        }

        // Create left smoke particle

        this.makeSmokeTileAt(
            {
                x: pos.x + leftOffset.x + behindOffset.x,
                y: pos.y + leftOffset.y + behindOffset.y,
            }
        );

        this.makeSmokeTileAt(
            {
                x: pos.x + rightOffset.x + behindOffset.x,
                y: pos.y + rightOffset.y + behindOffset.y,
            }
        );

        // this.makeSmokeTileAt(pos);
    }

    private makeSmokeTileAt(pos: Point): TileId {
        const tileId = this.display.createTile(
            pos.x,
            pos.y,
            '░',
            '#888888FF',
            '#00000000',
            998,
        );

        this.display.addColorAnimation(tileId, {
            bg: {
                start: '#888888FF',
                end: '#00000000',
                duration: 0.3,
                easing: Easing.linear,
                loop: false,
                removeOnComplete: true
            },
            fg: {
                start: '#888888FF',
                end: '#00000000',
                duration: 0.6,
                easing: Easing.linear,
                loop: false,
            }
        });

        return tileId;
    }

    public getVisibilityMask(): number[][] {
        return this.display.getVisibilityMask();
    }

    private createDestinationTile(entity: Entity): TileId | null {
        const prediction = this.movementPredictor.predictMove(entity);

        if (prediction.actions.length === 0) {
            return null;
        }

        const finalAction = prediction.actions[prediction.actions.length - 1];

        if (prediction.finalInertia.direction === Direction.None) {
            return null;
        }

        const rotation = directionToRadians(prediction.finalInertia.direction);

        const tileId = this.display.createTile(
            finalAction.data.to.x,
            finalAction.data.to.y,
            '➜',  // Unicode arrow character
            '#777777FF',
            '#222299FF',
            999,
            {
                bgPercent: 0.0,
                rotation: rotation,
                scaleSymbolX: 1.5,
                scaleSymbolY: 1.5,
            }
        );

        return tileId;
    }

    public handleUpdate(timestamp: number): void {
        throw new Error('Method not implemented.');
    }

    public displayMessage(message: string): void {
        const worldSize = this.world.getSize();
        const wipeDelay = 10; // ms between each row
        const wipeAlpha = '88';

        const viewport = this.display.getViewport();
        const viewportWidth = this.display.getViewportWidth();
        const viewportHeight = this.display.getViewportHeight();

        // Only create tiles within viewport bounds
        for (let y = viewport.y; y < viewport.y + viewportHeight; y++) {
            setTimeout(() => {
                for (let x = viewport.x; x < viewport.x + viewportWidth; x++) {
                    this.display.createTile(
                        x,
                        y,
                        ' ',
                        '#000000FF',
                        `#000000${wipeAlpha}`,
                        2000,
                    );
                }
            }, (y - viewport.y) * wipeDelay);
        }

        // After wipe completes, show game over text
        setTimeout(() => {
            const centerX = this.display.getViewport().x + Math.floor(this.display.getViewportWidth() / 2) - Math.floor(message.length / 2); // "GAME OVER" is 9 chars
            const centerY = this.display.getViewport().y + Math.floor(this.display.getViewportHeight() / 2);

            // Create black background behind text
            const messageWidth = message.length;
            for (let y = centerY - 1; y <= centerY + 1; y++) {
                for (let x = centerX; x <= centerX + messageWidth + 2; x++) {
                    this.display.createTile(
                        x,
                        y,
                        ' ',
                        '#FFFFFFFF', 
                        '#000000CC',
                        2001
                    );
                }
            }

            // Create the text
            const messageTileIds = this.display.createString(
                centerX+1,
                centerY,
                message,
                2002,
                {
                    animate: {
                        delayBetweenChars: 0.02,
                    },
                    fontWeight: 'bold',
                }
            );
        }, 500); // Start after wipe + small delay
        // ); // Start after wipe + small delay
    }

}