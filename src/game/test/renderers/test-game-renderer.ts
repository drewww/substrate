import { GameRenderer } from '../../../render/test/game-renderer';
import { Entity } from '../../../entity/entity';
import { MoveCooldownComponent } from '../components/move-cooldown.component';
import { Point } from '../../../types';
import { logger } from '../../../util/logger';

export class TestGameRenderer extends GameRenderer {
    protected handleEntityAdded(entity: Entity, tileId: string): void {}
    protected handleEntityModified(entity: Entity, componentType: string): void {}
    protected handleEntityRemoved(entity: Entity): void {}
    protected handleEntityMoved(entity: Entity, to: Point): void {}

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