import { World } from "../world";
import { WorldGenerator } from "../world-generator";
import { Entity } from "../../entity/entity";
import { SymbolComponent } from "../../entity/components/symbol-component";
import { OpacityComponent } from "../../entity/components/opacity-component";
import { ImpassableComponent } from "../../entity/components/impassable-component";
import { CooldownComponent } from "../../game/components/cooldown.component";
import { Direction } from "../../types";
import { FacingComponent } from "../../entity/components/facing-component";
import { PlayerComponent } from "../../entity/components/player-component";
import { VisionComponent } from "../../entity/components/vision-component";

export class EnemyWorldGenerator implements WorldGenerator {
    async generate(): Promise<World> {
        // Create a 200x200 world
        const world = new World(400, 400);

        // create a background entity for all ground tiles
        for (let x = 0; x < world.getWorldWidth(); x++) {
            for (let y = 0; y < world.getWorldHeight(); y++) {
                const tile = new Entity({x, y});
                tile.setComponent(new SymbolComponent('.', '#222222', '#111111', 0));
                world.addEntity(tile);
            }
        }
        // Create 400 enemies
        for (let i = 0; i < 400; i++) {
            // Random position within world bounds
            const x = Math.floor(Math.random() * world.getWorldWidth());
            const y = Math.floor(Math.random() * world.getWorldHeight());

            const enemy = new Entity({x, y});
            
            
            // Add components
            enemy.setComponent(new SymbolComponent(
                'E',                    // character
                '#FF0000FF',           // red color
                '#00000000',           // transparent background
                2                      // zIndex
            ));

            enemy.setComponent(new CooldownComponent({
                move: {
                    base: 4,
                    current: 4,
                    ready: false
                }
            }));

            const directions = [Direction.North, Direction.South, Direction.East, Direction.West];
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];

            enemy.setComponent(new FacingComponent(randomDirection));

            enemy.setComponent(new OpacityComponent());
            enemy.setComponent(new ImpassableComponent());
            
            // Add to world
            world.addEntity(enemy);
        }

        // add the player
        const player = new Entity({x: 100, y: 100});
        player.setComponent(new SymbolComponent('@', '#000000', '#FFFFFF', 0));
        player.setComponent(new FacingComponent(Direction.North));
        player.setComponent(new OpacityComponent());
        player.setComponent(new ImpassableComponent());
        player.setComponent(new PlayerComponent());
        player.setComponent(new VisionComponent(20));

        world.addEntity(player);
        
        return world;
    }
} 