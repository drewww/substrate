import { Engine, EngineConfig } from './engine';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { World } from '../world/world';
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('Engine', () => {
    let engine: Engine;
    let player: Entity;
    let world: World;
    let config: EngineConfig;

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
}); 