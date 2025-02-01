import { Entity } from '../../entity/entity';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { OpacityComponent } from '../../entity/components/opacity-component';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Direction, Point } from '../../types';
import { VisionComponent } from '../../entity/components/vision-component';
import { PlayerComponent } from '../../entity/components/player-component';
import { CooldownComponent } from '../../game/test/components/cooldown.component';
import { InertiaComponent } from '../../game/test/components/inertia.component';
import { EnemyAIComponent, EnemyAIType } from '../../game/test/components/enemy-ai.component';
import { FacingComponent } from '../../entity/components/facing-component';
import { FollowableComponent } from '../../entity/components/followable-component';
import { FollowerComponent } from '../../entity/components/follower-component';

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

export function createFloorEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const floor = new Entity(pos);
    
    floor.setComponent(new SymbolComponent(
        '.',
        '#FFFFFF',
        '#000000',
        100
    ));
    
    return floor;
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
    player.setComponent(new InertiaComponent(Direction.None, 0));
    player.setComponent(new CooldownComponent({
        move: {
            base: 4,
            current: 4,
            ready: false
        }
    }));

    return player;
} 

export function createEnemyFollowerEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const enemy = new Entity(pos);
    
    enemy.setComponent(new SymbolComponent('F', '#FF0000', '#000000', 100));
    enemy.setComponent(new OpacityComponent());
    enemy.setComponent(new ImpassableComponent());
    enemy.setComponent(new VisionComponent(10));
    enemy.setComponent(new EnemyAIComponent(EnemyAIType.FOLLOWER, 4, 10));
    enemy.setComponent(new CooldownComponent({
        move: {
            base: 4,
            current: 4,
            ready: false
        }
    }));

    return enemy;
}

export function createVehicleEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const vehicle = new Entity(pos);

    vehicle.setComponent(new SymbolComponent('E', '#0000FF', '#000000', 100));
    vehicle.setComponent(new FacingComponent(Direction.North));
    vehicle.setComponent(new OpacityComponent());
    vehicle.setComponent(new ImpassableComponent());
    vehicle.setComponent(new FollowableComponent());
    vehicle.setComponent(new CooldownComponent({
        move: {
            base: 4,
            current: 4,
            ready: false
        }
    }));

    return vehicle;
}

export function createFollowerEntity(pos: Point = { x: 0, y: 0 }): Entity {
    const follower = new Entity(pos);

    follower.setComponent(new SymbolComponent(' ', '#000000FF', '#441111FF', 100));
    follower.setComponent(new OpacityComponent());
    follower.setComponent(new ImpassableComponent());
    follower.setComponent(new FollowerComponent());
    follower.setComponent(new FollowableComponent());

    return follower;
}
