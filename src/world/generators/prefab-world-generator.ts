import { World } from "../world";
import { WorldGenerator } from "../world-generator";
import { Component } from "../../entity/component";
import { Entity } from "../../entity/entity";
import { SymbolComponent } from "../../entity/components/symbol-component";
import { OpacityComponent } from "../../entity/components/opacity-component";
import { PlayerComponent } from "../../entity/components/player-component";
import { ImpassableComponent } from "../../entity/components/impassable-component";
import { VisionComponent } from "../../entity/components/vision-component";
import { logger } from "../../util/logger";
import { CooldownComponent } from "../../game/test/components/cooldown.component";
import { FacingComponent } from "../../entity/components/facing-component";
import { FollowableComponent } from "../../entity/components/followable-component";
import { FollowerComponent } from "../../entity/components/follower-component";

interface SymbolDefinition {
    components: Component[];
}

export class PrefabWorldGenerator implements WorldGenerator {
    constructor(
        private readonly symbolDefinitions: string,  // Raw content of symbol definitions
        private readonly levelData: string          // Raw content of level data
    ) {}

    generate(): World {
        const startTime = performance.now();
        
        const symbols = this.parseSymbolDefinitions(this.symbolDefinitions);
        const symbolsTime = performance.now();
        logger.info(`Symbol parsing took ${symbolsTime - startTime}ms`);
        
        const level = this.parseLevelData(this.levelData);
        const levelTime = performance.now();
        logger.info(`Level parsing took ${levelTime - symbolsTime}ms`);
        
        const world = new World(level[0].length, level.length);
        world.unready();
        
        for (let y = 0; y < level.length; y++) {
            for (let x = 0; x < level[0].length; x++) {
                // logger.info(`level[y][x]: ${level[y][x]} x: ${x} y: ${y}`);
                for(const symbol of level[y][x]) {
                    const definition = symbols.get(symbol);
                    if (definition) {
                        const entity = new Entity({ x, y });
                        for (const component of definition.components) {
                            entity.setComponent(component.clone());
                        }
                        world.addEntity(entity);
                    }
                }
            }
        }
        
        const endTime = performance.now();
        logger.info(`World generation took ${endTime - startTime}ms to place ${world.getEntities().length} entities`);
        logger.info(`- Entity creation and placement: ${endTime - levelTime}ms`);

        world.ready();
        
        return world;
    }

    private parseSymbolDefinitions(content: string): Map<string, SymbolDefinition> {
        const symbols = new Map<string, SymbolDefinition>();
        
        // Split into lines and process each line
        const lines = content.trim().split('\n');
        for (const line of lines) {
            // Split into symbol and component definitions
            const [symbol, componentDefs] = line.trim().split(/\s+(.+)/);
            
            try {
                // Parse the JSON array of component definitions
                const componentArray = JSON.parse(componentDefs);
                const components = componentArray.map((def: any) => {
                    switch (def.type) {
                        case 'symbol':
                            return new SymbolComponent(
                                def.char,
                                def.foreground,
                                def.background,
                                def.zIndex,
                                def.alwaysRenderIfExplored
                            );
                        case 'opacity':
                            return new OpacityComponent();
                        case 'player':
                            return new PlayerComponent();
                        case 'impassable':
                            return new ImpassableComponent();
                        case 'vision':
                            return new VisionComponent(def.radius);
                        case 'cooldown':
                            return new CooldownComponent(def.cooldowns);
                        case 'facing':
                            return new FacingComponent(def.direction);
                        case 'followable':
                            return new FollowableComponent();
                        case 'follower':
                            return new FollowerComponent();
                        default:
                            console.error(`Unknown component type: ${def.type}`);
                            return null;
                    }
                }).filter((component: Component): component is Component => component !== null);
                
                symbols.set(symbol, { components });
            } catch (error) {
                console.error(`Error parsing symbol definition for ${symbol}:`, error);
            }
        }
        
        return symbols;
    }

    private parseLevelData(content: string): string[][][] {
        return content
            .trim()
            .split('\n')
            .map(line => line.split(',')
                .map(cell => cell.trim())
                .filter(cell => cell.length > 0)
                .map(cell => cell.split(''))  // Split each cell into individual characters
            );
    }
}