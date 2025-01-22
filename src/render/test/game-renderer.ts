import { Renderer } from '../renderer';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { BlendMode } from '../../display/display';
import { FadeComponent } from './test-components';
import { logger } from '../../util/logger';
import { Component } from '../../entity/component';
import { Easing } from '../../display/types';

export class GameRenderer extends Renderer {
    protected onEntityAdded(entity: Entity): void {
        super.onEntityAdded(entity);
        
        // After the tile is created, update its blend mode if it's a smoke cloud
        if (entity.hasComponent('fade')) {
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                this.display.updateTile(tileId, {
                    blendMode: BlendMode.SourceOver
                });
                
                const fade = entity.getComponent('fade') as FadeComponent;
                if (fade) {
                    this.display.addColorAnimation(tileId, {
                        bg: {
                            start: '#FFFFFFFF',
                            end: '#FFFFFF00',
                            duration: fade.duration,
                            easing: Easing.linear
                        }
                    });
                }
            }
        }
    }

    protected handleEntityAdded(entity: Entity, tileId: string): void {}

    protected handleEntityModified(entity: Entity, componentType: string): void {}
    protected handleComponentModified(entity: Entity, componentType: string): void {}
    protected handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
    protected handleEntityRemoved(entity: Entity): void {}
    protected handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        const tileId = this.entityTiles.get(entity.getId());
        if (!tileId) return false;

        // Add position animation
        this.display.addValueAnimation(tileId, {
            x: {
                start: from.x,
                end: to.x,
                duration: 1.0,
                easing: Easing.sineInOut
            },
            y: {
                start: from.y,
                end: to.y,
                duration: 1.0,
                easing: Easing.sineInOut
            }
        });

         return true;
        }
} 