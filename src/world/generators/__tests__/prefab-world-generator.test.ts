import { describe, it, expect, beforeEach } from 'vitest';
import { PrefabWorldGenerator } from '../prefab-world-generator';
import { SymbolComponent } from '../../../entity/components/symbol-component';
import { OpacityComponent } from '../../../entity/components/opacity-component';
import { PlayerComponent } from '../../../entity/components/player-component';
import { ImpassableComponent } from '../../../entity/components/impassable-component';
import { VisionComponent } from '../../../entity/components/vision-component';
import { ComponentRegistry } from '../../../entity/component-registry';
import { CooldownComponent } from '../../../game/components/cooldown.component';
import { FacingComponent } from '../../../entity/components/facing-component';
import { FollowableComponent } from '../../../entity/components/followable-component';
import { FollowerComponent } from '../../../entity/components/follower-component';
import { TurnComponent } from '../../../entity/components/turn-component';
import { LightEmitterComponent } from '../../../entity/components/light-emitter-component';
import { EnemyAIComponent } from '../../../game/components/enemy-ai.component';
import { ApplyTimestampComponent } from '../../../game/components/apply.timestamp.component';
import { Entity } from '../../../entity/entity';

// Register all components used in the tests
beforeEach(() => {
    // Clear existing registrations to prevent test interference
    (ComponentRegistry as any).components.clear();
    
    // Register ALL components that might be used in the test
    ComponentRegistry.register('symbol', SymbolComponent);
    ComponentRegistry.register('opacity', OpacityComponent);
    ComponentRegistry.register('player', PlayerComponent);
    ComponentRegistry.register('impassable', ImpassableComponent);
    ComponentRegistry.register('vision', VisionComponent);
    ComponentRegistry.register('cooldown', CooldownComponent);
    ComponentRegistry.register('facing', FacingComponent);
    ComponentRegistry.register('followable', FollowableComponent);
    ComponentRegistry.register('follower', FollowerComponent);
    ComponentRegistry.register('turn', TurnComponent);
    ComponentRegistry.register('lightEmitter', LightEmitterComponent);
    ComponentRegistry.register('enemyAI', EnemyAIComponent);
    ComponentRegistry.register('applyTimestamp', ApplyTimestampComponent);
});

describe('PrefabWorldGenerator', () => {
    // Example symbol definitions and level data that match the spec format
    const symbolDefinitions = `
#   [{"type": "symbol", "char": "#", "foreground": "#888888FF", "background": "#666666FF", "zIndex": 1}, {"type": "opacity", "isOpaque": true}, {"type": "impassable"}]
.   [{"type": "symbol", "char": ".", "foreground": "#333333FF", "background": "#000000FF", "zIndex": 1}]
@   [{"type": "symbol", "char": "@", "foreground": "#FFD700FF", "background": "#000000FF", "zIndex": 5}, {"type": "player"}, {"type": "vision", "radius": 30}]
`.trim();

    const levelData = `
#,#,#,#,#
#,.,@,.,#
#,.,.,.,#
#,.,.,.,#
#,#,#,#,#
`.trim();

    let generator: PrefabWorldGenerator;

    beforeEach(() => {
        generator = new PrefabWorldGenerator(symbolDefinitions, levelData);
    });

    describe('World Generation', () => {
        it('should create a world with correct dimensions', async () => {
            const world = await generator.generate();
            expect(world.getSize()).toEqual({ x: 5, y: 5 });
        });

        it('should correctly place wall entities', async () => {
            const world = await generator.generate();
            const walls = world.getEntities().filter((e: Entity) => 
                e.getComponent('symbol')?.type === 'symbol' && 
                (e.getComponent('symbol') as SymbolComponent).char === '#'
            );

            // Check wall positions (should be 12 wall tiles in our test level)
            expect(walls).toHaveLength(16);
            
            // Check wall components
            const firstWall = walls[0];
            expect(firstWall.hasComponent('opacity')).toBe(true);
            expect(firstWall.hasComponent('impassable')).toBe(true);
            
            const symbolComp = firstWall.getComponent('symbol') as SymbolComponent;
            expect(symbolComp.foreground).toBe('#888888FF');
            expect(symbolComp.background).toBe('#666666FF');
            expect(symbolComp.zIndex).toBe(1);
        });

        it('should correctly place and configure the player', async () => {
            const world = await generator.generate();
            const players = world.getEntitiesWithComponent('player');

            expect(players).toHaveLength(1);
            const player = players[0];

            // Check position (should be at 2,1 in our test level)
            expect(player.getPosition()).toEqual({ x: 2, y: 1 });

            // Check components
            expect(player.hasComponent('vision')).toBe(true);
            const vision = player.getComponent('vision') as VisionComponent;
            expect(vision.radius).toBe(30);

            const symbol = player.getComponent('symbol') as SymbolComponent;
            expect(symbol.char).toBe('@');
            expect(symbol.foreground).toBe('#FFD700FF');
            expect(symbol.background).toBe('#000000FF');
            expect(symbol.zIndex).toBe(5);
        });

        it('should correctly place floor tiles', async () => {
            const world = await generator.generate();
            const floors = world.getEntities().filter((e: Entity) => 
                e.getComponent('symbol')?.type === 'symbol' && 
                (e.getComponent('symbol') as SymbolComponent).char === '.'
            );

            // Should be 7 floor tiles in our test level
            expect(floors).toHaveLength(8);

            const firstFloor = floors[0];
            const symbol = firstFloor.getComponent('symbol') as SymbolComponent;
            expect(symbol.foreground).toBe('#333333FF');
            expect(symbol.background).toBe('#000000FF');
            expect(symbol.zIndex).toBe(1);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed symbol definitions', async () => {
            const badSymbolDefs = `
# this is not valid JSON
@ also not valid JSON
`.trim();
            
            const generator = new PrefabWorldGenerator(badSymbolDefs, levelData);
            const world = await generator.generate();
            
            // Should create an empty world with correct dimensions
            expect(world.getSize()).toEqual({ x: 5, y: 5 });
            expect(world.isEmpty()).toBe(true);
        });

        it('should handle unknown symbols in level data', async () => {
            const levelWithUnknownSymbols = `
#,#,#
#,X,#
#,#,#
`.trim();

            const generator = new PrefabWorldGenerator(symbolDefinitions, levelWithUnknownSymbols);
            const world = await generator.generate();

            // Should only create the wall entities, ignoring the unknown 'X' symbol
            const entities = world.getEntities();
            expect(entities).toHaveLength(8); // Just the walls
        });
    });
}); 