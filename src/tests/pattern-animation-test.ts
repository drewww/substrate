import { BaseTest } from './base-test';
import { LogLevel } from '../matrix-display';
import { TileId } from '../types';

export class PatternAnimationTest extends BaseTest {
    private animatedTiles: TileId[] = [];
    
    constructor(logLevel?: LogLevel) {
        super({
            worldWidth: 40,
            worldHeight: 20,
            viewportWidth: 40,
            viewportHeight: 20,
            cellSize: 24,
            logLevel
        });
    }

    getName(): string {
        return "pattern-animation";
    }

    getDescription(): string {
        return "Tests pattern-based animations";
    }

    protected run(): void {
        // Pattern 1: Binary counter
        const binarySymbols = ['0', '1'];
        const binaryId = this.display.createTile(5, 5, '0', '#00FF00FF', '#000000FF', 1);
        this.display.addSymbolAnimation(binaryId, binarySymbols, 30);
        this.animatedTiles.push(binaryId);

        // Pattern 2: Clock animation
        const clockSymbols = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
        const clockId = this.display.createTile(10, 5, '🕐', '#FFFFFFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(clockId, clockSymbols, 60);
        this.animatedTiles.push(clockId);

        // Pattern 3: Wave pattern
        const waveSymbols = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];
        const waveId = this.display.createTile(15, 5, '▁', '#0088FFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(waveId, waveSymbols, 8);
        this.animatedTiles.push(waveId);
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 