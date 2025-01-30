import { Engine, EngineOptions } from './engine';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { World } from '../world/world';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { TICK_MS } from '../game/test/constants';

// Mock window object for tests
const mockWindow = {
    setTimeout: vi.fn(),
    clearTimeout: vi.fn(),
};

// Mock document object for tests
const mockDocument = {
    addEventListener: vi.fn(),
    visibilityState: 'visible',
};

vi.stubGlobal('window', mockWindow);
vi.stubGlobal('document', mockDocument);

describe('Engine', () => {
    let engine: Engine;
    let player: Entity;
    let world: World;
    let config: EngineOptions;
    let currentTime: number;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        
        // Reset document visibility state
        mockDocument.visibilityState = 'visible';
        
        // Mock Date.now
        currentTime = 1000;
        vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

        // Set up setTimeout to just return an ID without executing callback
        mockWindow.setTimeout.mockImplementation(() => {
            return 1;
        });

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

    afterEach(() => {
        vi.clearAllMocks();
    });

    test('initializes with player in world', () => {
        const world = engine.getWorld();
        expect(world.getEntity(player.getId())).toBe(player);
        expect(player.getPosition()).toEqual({ x: 5, y: 5 });
    });

    test('processes move action on next tick', () => {
        engine.start();
        const newPos: Point = { x: 6, y: 5 };
        engine.handleAction({
            type: 'move',
            position: newPos
        });

        // Manually trigger tick instead of relying on setTimeout
        engine.tick();

        expect(player.getPosition()).toEqual(newPos);
    });

    test('ignores actions when stopped', () => {
        const startPos = player.getPosition();
        
        engine.stop();
        engine.handleAction({
            type: 'move',
            position: { x: 6, y: 5 }
        });

        engine.tick();

        expect(player.getPosition()).toEqual(startPos);
    });

    test('runs systems on each tick', () => {
        const systemSpy = vi.fn();
        engine.addSystem(systemSpy);
        engine.start();

        // Manually trigger ticks
        engine.tick();
        expect(systemSpy).toHaveBeenCalledTimes(1);

        engine.tick();
        expect(systemSpy).toHaveBeenCalledTimes(2);
    });

    test('maintains performance metrics', () => {
        engine.start();
        
        // Simulate some ticks
        for (let i = 0; i < 5; i++) {
            currentTime += TICK_MS;
            engine.tick();
        }

        const debugString = engine.getDebugString();
        expect(debugString).toContain('Updates/sec');
        expect(debugString).toContain('Update Time');
        expect(debugString).toContain('Total Updates: 5');
    });

    test('handles tab visibility changes', () => {
        engine.start();
        
        // Simulate tab becoming hidden
        mockDocument.visibilityState = 'hidden';
        const visibilityHandler = mockDocument.addEventListener.mock.calls
            .find(call => call[0] === 'visibilitychange')?.[1];
        
        // Ensure we found the handler
        expect(visibilityHandler).toBeDefined();
        if (!visibilityHandler) return;
        
        visibilityHandler();

        // Advance time significantly
        currentTime += 5000;
        engine.tick();

        // Verify accumulator was capped
        const debugString = engine.getDebugString();
        expect(debugString).toContain('Total Updates: 1');
    });
}); 