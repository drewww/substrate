import { GameRenderer } from '../../../render/test/game-renderer';
import { Entity } from '../../../entity/entity';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { Point } from '../../../types';
import { Easing, FillDirection, TileId } from '../../../display/types';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { logger } from '../../../util/logger';
import { World } from '../../../world/world';
import { Display } from '../../../display/display';
import { Component } from '../../../entity/component';
import { BufferedMoveComponent } from '../components/buffered-move.component';
import { Direction } from '../../../types';
import { InertiaComponent } from '../components/inertia.component';
import { StunComponent } from '../components/stun.component';
import { VisionComponent } from '../../../entity/components/vision-component';
import { CooldownComponent } from '../components/cooldown.component';
import { TICK_MS } from '../constants';
import { MovementPredictor } from '../systems/movement-predictor';

export class TestGameRenderer extends GameRenderer {
    private discoveredTiles: Set<string> = new Set();  // Store as "x,y" strings
    private bufferedMoveTiles: Map<string, string> = new Map(); // entityId -> tileId
    private movementPredictor: MovementPredictor;

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

    protected handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (componentType === 'bufferedMove') {
            const tileId = this.bufferedMoveTiles.get(entity.getId());
            if (tileId) {
                this.display.removeTile(tileId);
                this.bufferedMoveTiles.delete(entity.getId());
            }
        }
    }

    protected handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
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
                // check our inertia. if it's > 2, leave behind a fading "trail" tile
                const inertia = entity.getComponent('inertia') as InertiaComponent;
                if (inertia && inertia.magnitude >= 2) {
                    const trailTileId = this.display.createTile(from.x, from.y, ' ', '#FFFFFFFF', '#005577AA', 999, {
                        bgPercent: 1
                    });

                    this.display.addColorAnimation(trailTileId, {
                        bg: {
                            start: '#005577AA',
                            end: '#00557700',
                            duration: 8,
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
                        // Calculate direction angle based on movement
                        const angle = Math.atan2(dy, dx) + Math.PI / 4;

                        this.display.createTile(from.x, from.y, '=', '#fcb103ff', '#00000000', 1000, {
                            rotation: angle,
                            scaleSymbolX: 2.0,
                        });
                    }
                }
            }

            return true;
        }
        return false;
    }

    protected handleComponentModified(entity: Entity, componentType: string): void {
        if (componentType === 'bufferedMove' || componentType === 'inertia') {
            const prediction = this.movementPredictor.predictMove(entity);
            const tileId = this.bufferedMoveTiles.get(entity.getId());
            
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

        if (componentType === 'cooldown') {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            const tileId = this.entityTiles.get(entity.getId());
            const player = entity.hasComponent('player');

            if(!tileId) {
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
                            duration: stunState.base*TICK_MS/1000, // Convert ms to seconds
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
    }

    protected getOppositeDirection(dir: Direction): FillDirection {
        switch (dir) {
            case Direction.North: return FillDirection.BOTTOM;
            case Direction.South: return FillDirection.TOP;
            case Direction.East: return FillDirection.LEFT;
            case Direction.West: return FillDirection.RIGHT;
        }
    }

    protected handleComponentAdded(entity: Entity, componentType: string): void {
       
        // Handle bumping animation
        // logger.info(`Component added: ${entity.getId()} - ${componentType}`);
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
        if(componentType === 'bufferedMove') {
            const tileId = this.createDestinationTile(entity);
            this.bufferedMoveTiles.set(entity.getId(), tileId);
        }
    }

    private getTargetPosition(pos: Point, direction: Direction): Point {
        switch (direction) {
            case Direction.North: return { x: pos.x, y: pos.y - 1 };
            case Direction.South: return { x: pos.x, y: pos.y + 1 };
            case Direction.West: return { x: pos.x - 1, y: pos.y };
            case Direction.East: return { x: pos.x + 1, y: pos.y };
        }
    }

    public getVisibilityMask(): number[][] {
        return this.display.getVisibilityMask();
    }

    private createDestinationTile(entity: Entity): TileId {
        const prediction = this.movementPredictor.predictMove(entity);
        const finalAction = prediction.actions[prediction.actions.length - 1];

        // Convert direction to radians for rotation
        const directionToRadians = (direction: Direction): number => {
            switch (direction) {
                case Direction.South: return Math.PI/2;   // Down
                case Direction.East: return 0;            // Right
                case Direction.North: return -Math.PI/2;  // Up
                case Direction.West: return Math.PI;      // Left
            }
        };

        const rotation = directionToRadians(prediction.finalInertia.direction);

        const tileId = this.display.createTile(
            finalAction.data.to.x,
            finalAction.data.to.y,
            '➜',  // Unicode arrow character
            '#FFFFFFFF',
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
}