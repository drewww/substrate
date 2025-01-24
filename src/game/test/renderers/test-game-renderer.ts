import { GameRenderer } from '../../../render/test/game-renderer';
import { Entity } from '../../../entity/entity';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { Point } from '../../../types';
import { Easing, FillDirection } from '../../../display/types';
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

export class TestGameRenderer extends GameRenderer {
    private discoveredTiles: Set<string> = new Set();  // Store as "x,y" strings
    private bufferedMoveTiles: Map<string, string> = new Map(); // entityId -> tileId
    private inertiaTiles: Map<string, string> = new Map(); // entityId -> tileId

    constructor(display: Display, world: World) {
        super(world, display);
        
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
        // logger.info(`handleComponentRemoved ${entity.getId()} - ${componentType}`);
        // if (componentType === 'bufferedMove') {
        //     const tileId = this.bufferedMoveTiles.get(entity.getId());
        //     if (tileId) {
        //         this.display.removeTile(tileId);
        //         this.bufferedMoveTiles.delete(entity.getId());
        //     }
        // }
        if (componentType === 'inertia') {
            const tileId = this.inertiaTiles.get(entity.getId());
            if (tileId) {
                this.display.removeTile(tileId);
                this.inertiaTiles.delete(entity.getId());
            }
        }
    }

    protected handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        // logger.info(`handleEntityMoved ${entity.getId()} from ${from.x},${from.y} to ${to.x},${to.y}`);

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

            if(isPlayer) {
                // check our inertia. if it's > 2, leave behind a fading "trail" tile
                const inertia = entity.getComponent('inertia') as InertiaComponent;
                if(inertia && inertia.magnitude >= 2) {
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
                    
                        // this is close, but not quite right. once a slide is initiated, we want to show tracks continuous
                        // not just on the "non-slide" directional moves. but it'll do for now.
                    if(inertia.magnitude >= 3 && inertia.magnitude < 8 && isInertiaPerpendicularToMovement) {

                        // Calculate direction angle based on movement
                        const angle = Math.atan2(dy, dx)+Math.PI/4;
                        
                        this.display.createTile(from.x, from.y, '=', '#fcb103ff', '#00000000', 1000, {
                            rotation: angle,
                            scaleSymbolX: 2.0,
                        });
                    }

                    // Move this entity's inertia indicator tile if it exists
                    const inertiaTileId = this.inertiaTiles.get(entity.getId());
                    if (inertiaTileId) {
                        // Calculate new position relative to current position
                        let newPos: Point;
                        switch (inertia.direction) {
                            case Direction.North: newPos = { x: to.x, y: to.y - 1 }; break;
                            case Direction.South: newPos = { x: to.x, y: to.y + 1 }; break;
                            case Direction.West:  newPos = { x: to.x - 1, y: to.y }; break;
                            case Direction.East:  newPos = { x: to.x + 1, y: to.y }; break;
                        }
                        
                        // Move the indicator tile with the same animation as the entity
                        this.display.addValueAnimation(inertiaTileId, {
                            x: {
                                start: from.x + (newPos.x - to.x),
                                end: newPos.x,
                                duration: duration,
                                easing: Easing.quadOut,
                                loop: false
                            },
                            y: {
                                start: from.y + (newPos.y - to.y),
                                duration: duration,
                                end: newPos.y,
                                easing: Easing.quadOut,
                                loop: false
                            }
                        });
                    }
                }
            }

            return true;
        }
        return false;
    }

    protected handleComponentModified(entity: Entity, componentType: string): void {
        // Handle movement cooldown
        // logger.info(`Component modified: ${entity.getId()} - ${componentType}`);
        if (componentType === 'moveCooldown') {
            const cooldown = entity.getComponent('moveCooldown') as MoveCooldownComponent;
            const tileId = this.entityTiles.get(entity.getId());
            
            if (cooldown && tileId) {
                const percent = 1 - (cooldown.cooldown / cooldown.baseTime);

                const color = entity.hasComponent('player') ? '#005577' : '#FF0000';

                this.display.updateTile(tileId, {
                    bg: color,
                    bgPercent: percent,
                    fillDirection: FillDirection.BOTTOM
                });
            }
        }

        if (componentType === 'inertia') {
            // when inertia is modified, edit the tile properties directly.
            const inertia = entity.getComponent('inertia') as InertiaComponent;
            const tileId = this.inertiaTiles.get(entity.getId());
            if (tileId) {
                this.display.updateTile(tileId, {
                    bgPercent: inertia.magnitude / 8,
                    fillDirection: this.getOppositeDirection(inertia.direction)
                });
            }
        }

        if (componentType === 'stun') {
            const stun = entity.getComponent('stun') as StunComponent;
            const tileId = this.entityTiles.get(entity.getId());
            
            if (stun && tileId) {
                const percent = 1 - (stun.cooldown / stun.duration);

                const color = entity.hasComponent('player') ? '#770505' : '#FF0000';

                this.display.updateTile(tileId, {
                    bg: color,
                    bgPercent: percent,
                    fillDirection: FillDirection.TOP
                });
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

        if (componentType === 'inertia') {
            const inertia = entity.getComponent('inertia') as InertiaComponent;
            const pos = entity.getPosition();

            const player = this.world.getEntitiesWithComponent('player')[0];
            if(!player) return;

            // Calculate target position
            let targetPos: Point;
            switch (inertia.direction) {
                    case Direction.North: targetPos = { x: player.getPosition().x, y: player.getPosition().y - 3 }; break;
                    case Direction.South: targetPos = { x: player.getPosition().x, y: player.getPosition().y + 3 }; break;
                    case Direction.West:  targetPos = { x: player.getPosition().x - 3, y: player.getPosition().y }; break;
                    case Direction.East:  targetPos = { x: player.getPosition().x + 3, y: player.getPosition().y }; break;
                }
    
            // Create indicator tile
            const tileId = this.display.createTile(
                targetPos.x,
                targetPos.y,
                ' ',  // no character
                '#FFFFFFFF',  // transparent foreground
                '#ff073aAA',    // background color
                1000,           // zIndex
                {
                    bgPercent: (inertia.magnitude / 8), 
                    fillDirection: this.getOppositeDirection(inertia.direction)
                }
            );
    
                // Store the tile ID for later removal
            this.inertiaTiles.set(entity.getId(), tileId);    
        }
    }
    
    public getVisibilityMask(): number[][] {
        return this.display.getVisibilityMask();
    }
}