import { Renderer } from '../renderer';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { Easing } from '../../display/display';
import { FadeComponent } from './test-components';
import { logger } from '../../util/logger';

export class GameRenderer extends Renderer {
    protected handleEntityAdded(entity: Entity, tileId: string): void {
        // Handle fade component if present
        if (entity.hasComponent('fade')) {
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

    protected handleEntityModified(entity: Entity, componentType: string): void {}
    protected handleComponentModified(entity: Entity, componentType: string): void {}
    protected handleEntityRemoved(entity: Entity): void {}
    protected handleEntityMoved(entity: Entity, to: Point): void {}
} 