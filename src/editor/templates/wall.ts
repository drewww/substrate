import { Entity } from '../../entity/entity';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Point } from '../../types';

export function createWallEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const wall = new Entity(pos);
    
    wall.setComponent(new SymbolComponent(
        '#',
        '#666666', // Grey foreground
        '#FFFFFF', // White background
        100 // z-index
    ));
    
    wall.setComponent(new OpacityComponent());
    wall.setComponent(new ImpassableComponent());
    
    return wall;
} 