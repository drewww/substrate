import { GameRenderer } from '../../../render/test/game-renderer';
import { Entity } from '../../../entity/entity';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { Point } from '../../../types';
import { Easing } from '../../../display/display';
import { BumpingComponent } from '../../../entity/components/bumping-component';
import { logger } from '../../../util/logger';

export class TestGameRenderer extends GameRenderer {
    protected handleEntityAdded(entity: Entity, tileId: string): void {
        // Add FOV overlay tiles for undiscovered/non-visible areas
        if (!entity.hasComponent('discoveredByPlayer')) {
            this.display.createTile(
                entity.getPosition().x,
                entity.getPosition().y,
                ' ',  // char
                '#000000',  // color
                '#000000',  // backgroundColor
                100  // zIndex - Very high to be on top
            );
        } else if (!entity.hasComponent('visibleToPlayer')) {
            this.display.createTile(
                entity.getPosition().x,
                entity.getPosition().y,
                ' ',  // char
                '#000000',  // color
                '#000000CC',  // backgroundColor - 80% opacity black
                100  // zIndex
            );
        }
    }

    protected handleEntityModified(entity: Entity, componentType: string): void {
        if (componentType === 'bumping') {
            logger.info('Bumping component detected');
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

        if (componentType === 'visibleToPlayer' || componentType === 'discoveredByPlayer') {
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                // Update visibility overlay
                if (!entity.hasComponent('discoveredByPlayer')) {
                    this.display.updateTile(tileId, {
                        bg: '#000000',
                    });
                } else if (!entity.hasComponent('visibleToPlayer')) {
                    this.display.updateTile(tileId, {
                        bg: '#000000CC',
                    });
                } else {
                    // Fully visible - remove overlay
                    this.display.updateTile(tileId, {
                        bg: '#00000000',
                    });
                }
            }
        }
    }

    protected handleEntityRemoved(entity: Entity): void {}

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
        if (componentType === 'moveCooldown') {
            const cooldown = entity.getComponent('moveCooldown') as MoveCooldownComponent;
            const tileId = this.entityTiles.get(entity.getId());
            
            if (cooldown && tileId) {
                // Calculate percentage (0-1), inverted so it fills up as cooldown increases
                const percent = 1 - (cooldown.cooldown / cooldown.baseTime);
                
                // Update the tile's background fill percentage
                this.display.updateTile(tileId, {
                    bg: '#FF0000',
                    bgPercent: percent
                });
            }
        } 
    }
} 