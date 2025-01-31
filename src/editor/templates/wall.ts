import { Entity } from '../../entity/entity';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Point } from '../../types';
import { VisionComponent } from '../../entity/components/vision-component';
import { PlayerComponent } from '../../entity/components/player-component';

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

export function createPlayerEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const player = new Entity(pos);
    
    player.setComponent(new SymbolComponent(
        '@',
        '#FFFF00FF', // White foreground
        '#00000000', // Black background
        100 // z-index
    ));
    
    player.setComponent(new OpacityComponent());
    player.setComponent(new ImpassableComponent());
    player.setComponent(new VisionComponent(20));
    player.setComponent(new PlayerComponent());
    
    return player;
} 