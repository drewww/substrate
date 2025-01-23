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

export class TestGameRenderer extends GameRenderer {
    private readonly VISION_RADIUS = 10;  // Chebyshev distance for visibility
    private discoveredTiles: Set<string> = new Set();  // Store as "x,y" strings
    private bufferedMoveTiles: Map<string, string> = new Map(); // entityId -> tileId

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

        // // Subscribe to entity movement to update visibility
        // this.world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
        //     // if (data.entity.hasComponent('player')) {
        //     //     // Update visibility immediately using the destination position
        //     //     this.updateVisibility();
        //     // }
        //     return this.handleEntityMoved(data.entity, data.from, data.to);
        // });

        this.world.on('playerVisionUpdated', (data: { playerPos: Point, visibleLocations: Set<string> }) => {
            this.updateVisibility(data.playerPos);
        });
    }

    public updateVisibility(overridePosition?: Point): void {
        const player = this.world.getEntitiesWithComponent('player')[0];
        if (!player) return;

        // Use override position if provided, otherwise use player's current position
        const pos = overridePosition || player.getPosition();
        const worldSize = this.world.getSize();
        const mask = Array(worldSize.y).fill(0).map(() => Array(worldSize.x).fill(0));

        // Calculate currently visible tiles
        for (let y = Math.max(0, pos.y - this.VISION_RADIUS); y <= Math.min(worldSize.y - 1, pos.y + this.VISION_RADIUS); y++) {
            for (let x = Math.max(0, pos.x - this.VISION_RADIUS); x <= Math.min(worldSize.x - 1, pos.x + this.VISION_RADIUS); x++) {
                
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
                    bgPercent: percent
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
        if (componentType === 'bufferedMove') {
            const bufferedMove = entity.getComponent('bufferedMove') as BufferedMoveComponent;
            const pos = entity.getPosition();
            
            // Calculate target position
            let targetPos: Point;
            switch (bufferedMove.direction) {
                case Direction.North: targetPos = { x: pos.x, y: pos.y - 1 }; break;
                case Direction.South: targetPos = { x: pos.x, y: pos.y + 1 }; break;
                case Direction.West:  targetPos = { x: pos.x - 1, y: pos.y }; break;
                case Direction.East:  targetPos = { x: pos.x + 1, y: pos.y }; break;
            }

            // Create indicator tile
            const tileId = this.display.createTile(
                targetPos.x,
                targetPos.y,
                ' ',  // no character
                '#FFFFFFFF',  // transparent foreground
                '#005577AA',    // background color
                1000,           // zIndex
                {
                    bgPercent: 0.4,  // 40% coverage
                    fillDirection: this.getOppositeDirection(bufferedMove.direction)
                }
            );

            // Store the tile ID for later removal
            this.bufferedMoveTiles.set(entity.getId(), tileId);

            logger.info(`created buffered move tile ${tileId} for entity ${entity.getId()} at ${targetPos.x},${targetPos.y}`);
        }

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
    }
    
    public getVisibilityMask(): number[][] {
        return this.display.getVisibilityMask();
    }
}