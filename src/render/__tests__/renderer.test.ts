import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { Renderer } from '../renderer';
import { Display } from '../../display/display';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Point } from '../../types';
import { SymbolComponent } from '../../entity/components/symbol-component';
// Mock Display class
class MockDisplay implements Pick<Display, 'createTile' | 'removeTile' | 'moveTile'> {
    public tiles: Map<string, { x: number, y: number }> = new Map();
    private tileCounter = 0;

    createTile = vi.fn((x: number, y: number) => {
        const tileId = `tile_${this.tileCounter++}`;
        this.tiles.set(tileId, { x, y });
        return tileId;
    });

    removeTile = vi.fn((tileId: string) => {
        this.tiles.delete(tileId);
    });

    moveTile = vi.fn((tileId: string, x: number, y: number) => {
        const tile = this.tiles.get(tileId);
        if (tile) {
            tile.x = x;
            tile.y = y;
        }
    });
}

// Concrete test implementation of Renderer
class TestRenderer extends Renderer {
    protected handleComponentModified(entity: Entity, componentType: string): void {}
    protected handleEntityAdded(entity: Entity, tileId: string): void {}
    protected handleEntityModified(entity: Entity, componentType: string): void {}
    protected handleEntityRemoved(entity: Entity): void {}
    protected handleEntityMoved(entity: Entity, to: Point): void {}
}

describe('Renderer', () => {
    let world: World;
    let display: MockDisplay;
    let renderer: TestRenderer;
    
    beforeEach(() => {
        world = new World(10, 10);
        display = new MockDisplay();
        renderer = new TestRenderer(world, display as unknown as Display);
    });

    it('creates a tile when entity with symbol is added', () => {
        const entity = new Entity({ x: 1, y: 1 });
        entity.setComponent(new SymbolComponent('@', '#ffffff', '#000000', 1));
        world.addEntity(entity);

        expect(display.createTile).toHaveBeenCalledWith(1, 1, '@', '#ffffff', '#000000', 1);
        expect(display.tiles.size).toBe(1);
    });

    it('ignores entities without symbol component', () => {
        const entity = new Entity({ x: 1, y: 1 });
        world.addEntity(entity);

        expect(display.createTile).not.toHaveBeenCalled();
        expect(display.tiles.size).toBe(0);
    });

    it('removes tile when entity is removed', () => {
        const entity = new Entity({ x: 1, y: 1 });
        entity.setComponent(new SymbolComponent('@'));
        world.addEntity(entity);
        
        const [tileId] = display.tiles.keys();
        world.removeEntity(entity.getId());
        
        expect(display.removeTile).toHaveBeenCalledWith(tileId);
        expect(display.tiles.size).toBe(0);
    });

    it('updates tile position when entity moves', () => {
        const entity = new Entity({ x: 1, y: 1 });
        entity.setComponent(new SymbolComponent('@'));
        world.addEntity(entity);
        
        const [tileId] = display.tiles.keys();
        const newPos: Point = { x: 2, y: 2 };
        
        world.moveEntity(entity.getId(), newPos);
        
        expect(display.moveTile).toHaveBeenCalledWith(tileId, 2, 2);
        expect(display.tiles.get(tileId)).toEqual(newPos);
    });
}); 