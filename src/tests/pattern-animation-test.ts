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

        // Color animation 1: Pulsing red background
        const pulsingId = this.display.createTile(5, 10, '♥', '#FFFFFFFF', '#FF000088', 1);
        this.display.addColorAnimation(pulsingId, {
            bg: {
                start: '#FF000088',
                end: '#FF0000FF',
                duration: 2.0,
                reverse: true,
                offset: 0
            }
        });
        this.animatedTiles.push(pulsingId);

        // Color animation 2: Rainbow text
        const rainbowId = this.display.createTile(10, 10, '★', '#FF0000FF', '#000000FF', 1);
        this.display.addColorAnimation(rainbowId, {
            fg: {
                start: '#FF0000FF',
                end: '#00FF00FF',
                duration: 3.0,
                reverse: true,
                offset: 0
            }
        });
        this.animatedTiles.push(rainbowId);

        // Color animation 3: Combined fg/bg with offset
        for (let i = 0; i < 5; i++) {
            const waveTileId = this.display.createTile(15 + i, 10, '◆', '#FFFFFFFF', '#0000FFFF', 1);
            this.display.addColorAnimation(waveTileId, {
                fg: {
                    start: '#FFFFFFFF',
                    end: '#00FFFFFF',
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.2
                },
                bg: {
                    start: '#0000FFFF',
                    end: '#000000FF',
                    duration: 1.5,
                    reverse: true,
                    offset: i * 0.2
                }
            });
            this.animatedTiles.push(waveTileId);
        }
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 