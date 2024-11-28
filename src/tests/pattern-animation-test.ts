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
        this.display.addSymbolAnimation(binaryId, binarySymbols, 2.0);
        this.animatedTiles.push(binaryId);

        // Pattern 2: Clock animation
        const clockSymbols = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
        const clockId = this.display.createTile(10, 5, '🕐', '#FFFFFFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(clockId, clockSymbols, 12.0);
        this.animatedTiles.push(clockId);

        // Pattern 3: Wave pattern
        const waveSymbols = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'];
        const waveId = this.display.createTile(15, 5, '▁', '#0088FFFF', '#000000FF', 1);
        this.display.addSymbolAnimation(waveId, waveSymbols, 1.0, true);
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

        // Color animation 4: Wide wave with shared start time
        const sharedStartTime = performance.now();
        for (let i = 0; i < this.display.getWorldWidth(); i++) {
            const wideTileId = this.display.createTile(i, 15, '▀', '#FFFFFFFF', '#000000FF', 1);
            this.display.addColorAnimation(wideTileId, {
                fg: {
                    start: '#FF0000FF',
                    end: '#0000FFFF',
                    duration: 2.0,
                    reverse: true,
                    offset: i * 0.02  // Smaller offset for smoother wave
                },
                startTime: sharedStartTime
            });
            this.animatedTiles.push(wideTileId);
        }
    }

    protected cleanup(): void {
        this.animatedTiles.forEach(id => this.display.removeTile(id));
        this.animatedTiles = [];
    }
} 