import { BaseTest } from './base-test';
import { TileId } from '../../types';
import { Easing } from '../../display';

export class BasicAnimationTest extends BaseTest {
    private tileIds: TileId[] = [];
    
    constructor() {
        super({
            worldWidth: 20,
            worldHeight: 10,
            viewportWidth: 20,
            viewportHeight: 10,
            cellWidth: 12,
            cellHeight: 24,
        });
    }

    getName(): string {
        return "basic-animation";
    }

    getDescription(): string {
        return "Basic test with one of each animation type";
    }

    protected run(): void {
        this.display.setBackground(' ', '#000000FF', '#000000FF');

        // 1. Symbol Animation - rotating symbols
        const symbolTileId = this.display.createTile(5, 3, '◆', '#FFFFFFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(symbolTileId, {
            symbol: {
                symbols: ['◆', '●', '■', '▲'],
                duration: 1.0,
                loop: true
            }
        });
        this.tileIds.push(symbolTileId);

        // 2. Color Animation - pulsing red
        const colorTileId = this.display.createTile(10, 3, '♥', '#FF0000FF', '#000000FF', 1);
        this.display.addColorAnimation(colorTileId, {
            fg: {
                start: '#FF0000FF',
                end: '#FF000022',
                duration: 1.0,
                reverse: true,
                easing: Easing.sineInOut,
                loop: true
            }
        });
        this.tileIds.push(colorTileId);

        // 3. Value Animation - vertical bounce
        const valueTileId = this.display.createTile(15, 3, '○', '#00FF00FF', '#000000FF', 1);
        this.display.addValueAnimation(valueTileId, {
            offsetSymbolY: {
                start: -0.5,
                end: 0.5,
                duration: 1.0,
                reverse: true,
                easing: Easing.bounceOut,
                loop: true
            }
        });
        this.tileIds.push(valueTileId);
    }

    protected cleanup(): void {
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
    }
} 