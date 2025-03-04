import { ActionClass, BaseAction } from '../../action/action-handler';
import { World } from '../../world/world';
import { Point } from '../../types';
import { Entity } from '../../entity/entity';
import { FacingComponent } from '../../entity/components/facing-component';
import { Direction } from '../../types';
import { logger } from '../../util/logger';

interface EntitySpawnActionData {
    template: any;
    position: Point;
    facing?: Direction;
}

export const EntitySpawnAction: ActionClass<EntitySpawnActionData> = {
    canExecute(world: World, action: BaseAction<EntitySpawnActionData>): boolean {
        const { position } = action.data;
        const isBlocked = world.getEntitiesAt(position).some(e => e.hasComponent('impassable'));
        if (isBlocked) {
            logger.warn(`Cannot spawn entity at ${JSON.stringify(position)} - position is blocked`);
        }
        return !isBlocked;
    },

    execute(world: World, action: BaseAction<EntitySpawnActionData>): boolean {
        const { template, position, facing } = action.data;

        try {
            const entity = Entity.deserialize({
                ...template,
                position
            });

            if (facing) {
                entity.setComponent(new FacingComponent(facing));
            }

            world.addEntity(entity);
            return true;
        } catch (error) {
            return false;
        }
    }
}; 