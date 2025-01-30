import { World } from '../../world/world';
import { Entity } from '../../entity/entity';
import { BaseRenderer } from '../base-renderer';
import { FillDirection } from '../../display/types';
import { Tile } from '../../display/types';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Point } from '../../types';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { Display } from '../../display/display';


class MockDisplay implements Pick<Display, 'createTile' | 'removeTile' | 'moveTile' | 'updateTile' | 'getTile' | 'addFrameCallback'> {
    public tiles: Map<string, Tile> = new Map();
    private tileCounter = 0;
    private frameCallbacks: ((display: Display, timestamp: number) => void)[] = [];

    createTile = vi.fn((x: number, y: number, char: string, fg: string, bg: string, zIndex: number, config?: any) => {
        const tileId = `tile_${this.tileCounter++}`;
        const tile: Tile = {
            id: tileId,
            x,
            y,
            char,
            color: fg,
            backgroundColor: bg,
            zIndex,
            bgPercent: 1,
            alwaysRenderIfExplored: config?.alwaysRenderIfExplored ?? false,
            blendMode: config?.blendMode,
            rotation: 0,
            scaleSymbolX: 1,
            scaleSymbolY: 1,
            offsetSymbolX: 0,
            offsetSymbolY: 0,
            fillDirection: FillDirection.BOTTOM,
            noClip: false
        };
        this.tiles.set(tileId, tile);
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

    updateTile = vi.fn((tileId: string, config: any) => {
        const tile = this.tiles.get(tileId);
        if (tile) {
            Object.assign(tile, {
                char: config.char,
                color: config.fg,
                backgroundColor: config.bg,
                zIndex: config.zIndex,
                ...config
            });
        }
    });

    getTile = vi.fn((tileId: string): Tile | undefined => {
        return this.tiles.get(tileId);
    });

    addFrameCallback = vi.fn((callback: (display: Display, timestamp: number) => void) => {
        this.frameCallbacks.push(callback);
    });

    // Helper method to trigger frame callbacks (useful for testing animations)
    triggerFrame(timestamp: number) {
        this.frameCallbacks.forEach(callback => callback(this as unknown as Display, timestamp));
    }
}

// Concrete test implementation of Renderer
class TestRenderer extends BaseRenderer {
    public handleComponentModified(entity: Entity, componentType: string): void {}
    public handleComponentAdded(entity: Entity, componentType: string): void {}
    public handleEntityAdded(entity: Entity, tileId: string): void {}
    public handleEntityModified(entity: Entity, componentType: string): void {}
    public handleEntityRemoved(entity: Entity): void {}
    public handleEntityMoved(entity: Entity, to: Point): boolean { return false; }
    public handleComponentRemoved(entity: Entity, componentType: string): void {}
    public handleUpdate(timestamp: number): void {}
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
        entity.setComponent(new SymbolComponent('@', '#ffffff', '#000000', 1, true));
        world.addEntity(entity);

        expect(display.createTile).toHaveBeenCalledWith(
            1,
            1,
            '@',
            '#ffffff',
            '#000000',
            1,
            {
                alwaysRenderIfExplored: true
            }
        );
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
        // Only check x and y properties of the tile
        const tile = display.tiles.get(tileId);
        expect({ x: tile?.x, y: tile?.y }).toEqual(newPos);
    });
}); 