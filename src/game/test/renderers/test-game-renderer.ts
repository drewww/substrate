import { GameRenderer } from '../../../render/test/game-renderer';
import { Entity } from '../../../entity/entity';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { Point } from '../../../types';
import { Easing } from '../../../display/display';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { logger } from '../../../util/logger';
import { World } from '../../../world/world';
import { Display } from '../../../display/display';

export class TestGameRenderer extends GameRenderer {
    constructor(display: Display, world: World) {
        super(world, display);
        
        // Subscribe to component modifications
        this.world.on('componentModified', (data: { entity: Entity, componentType: string }) => {
            this.handleComponentModified(data.entity, data.componentType);
        });
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
            return true;
        }
        return false;
    }

    protected handleComponentModified(entity: Entity, componentType: string): void {
        // Handle movement cooldown
        logger.info(`Component modified: ${entity.getId()} - ${componentType}`);
        if (componentType === 'moveCooldown') {
            const cooldown = entity.getComponent('moveCooldown') as MoveCooldownComponent;
            const tileId = this.entityTiles.get(entity.getId());
            
            if (cooldown && tileId) {
                const percent = 1 - (cooldown.cooldown / cooldown.baseTime);
                this.display.updateTile(tileId, {
                    bg: '#FF0000',
                    bgPercent: percent
                });
            }
        }
    }

    protected handleComponentAdded(entity: Entity, componentType: string): void {
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
    }
} 