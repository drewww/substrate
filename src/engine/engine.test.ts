import { Engine, EngineOptions } from './engine';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { World } from '../world/world';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('Engine', () => {
    let engine: Engine;
    let player: Entity;
    let world: World;
    let config: EngineOptions;

    beforeEach(() => {
        world = new World(20, 20);
        player = new Entity({ x: 5, y: 5 });
        world.addEntity(player);
        
        config = {
            mode: 'realtime',
            worldWidth: 20,
            worldHeight: 20,
            player,
            world
        };
        engine = new Engine(config);
    });

    test('initializes with player in world', () => {
        const world = engine.getWorld();
        expect(world.getEntity(player.getId())).toBe(player);
        expect(player.getPosition()).toEqual({ x: 5, y: 5 });
    });

    test('processes move action for player', () => {
        const newPos: Point = { x: 6, y: 5 };
        engine.handleAction({
            type: 'move',
            position: newPos
        });

        // Process the action
        engine.update(performance.now());

        expect(player.getPosition()).toEqual(newPos);
    });

    test('ignores invalid move actions', () => {
        const originalPos = player.getPosition();
        const invalidPos: Point = { x: -1, y: 5 };
        
        engine.handleAction({
            type: 'move',
            position: invalidPos
        });

        engine.update(performance.now());

        expect(player.getPosition()).toEqual(originalPos);
    });

    test('updates entities with deltaTime', () => {
        const mockUpdate = vi.fn();
        const updateEntity = new Entity({ x: 0, y: 0 });
        (updateEntity as any).update = mockUpdate;

        engine.getWorld().addEntity(updateEntity);

        const time1 = 1000;
        const time2 = 1016; // 16ms later
        
        engine.start();
        engine.update(time1);
        engine.update(time2);

        expect(mockUpdate).toHaveBeenCalledWith(0.016); // 16ms in seconds
    });

    test('respects running state', () => {
        const startPos = player.getPosition();
        
        engine.stop();
        engine.handleAction({
            type: 'move',
            position: { x: 6, y: 5 }
        });

        engine.update(performance.now());

        expect(player.getPosition()).toEqual(startPos);
    });

    test('queues multiple actions and processes in order', () => {
        const moves = [
            { x: 6, y: 5 },
            { x: 6, y: 6 },
            { x: 7, y: 6 }
        ];

        moves.forEach(pos => {
            engine.handleAction({
                type: 'move',
                position: pos
            });
        });

        engine.update(performance.now());

        expect(player.getPosition()).toEqual(moves[moves.length - 1]);
    });

    describe('event batching', () => {
        test('batches events during update cycle', () => {
            const events: string[] = [];
            world.on('entityMoved', () => events.push('moved'));
            
            // Queue up multiple moves
            engine.handleAction({ type: 'move', position: { x: 6, y: 5 } });
            engine.handleAction({ type: 'move', position: { x: 7, y: 5 } });
            engine.handleAction({ type: 'move', position: { x: 8, y: 5 } });
            
            // Should process all moves but only emit events once at the end
            engine.update(performance.now());
            
            expect(events.length).toBe(3); // All events processed in one batch
            expect(player.getPosition()).toEqual({ x: 8, y: 5 });
        });

        test('events outside update cycle are not batched', () => {
            const events: string[] = [];
            world.on('entityMoved', () => events.push('moved'));
            
            // Direct world manipulation outside engine update
            world.moveEntity(player.getId(), { x: 6, y: 5 });
            expect(events.length).toBe(1); // Immediate event
            
            world.moveEntity(player.getId(), { x: 7, y: 5 });
            expect(events.length).toBe(2); // Another immediate event
        });

        test('systems receive consistent world state during update', () => {
            const systemStates: Point[] = [];
            const testSystem = (deltaTime: number) => {
                systemStates.push({...player.getPosition()});
            };
            
            engine.addSystem(testSystem);
            
            // Queue multiple moves
            engine.handleAction({ type: 'move', position: { x: 6, y: 5 } });
            engine.handleAction({ type: 'move', position: { x: 7, y: 5 } });
            
            engine.update(performance.now());
            
            // System should see the final state, not intermediate states
            expect(systemStates).toEqual([{ x: 7, y: 5 }]);
        });
    });
}); 