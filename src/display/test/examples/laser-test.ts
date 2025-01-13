import { BaseTest } from './base-test';
import { TileId, BlendMode } from '../../types';
import { Easing } from '../../display';

type LineType = 'row' | 'column';
interface Line {
    type: LineType;
    index: number;
    tiles: TileId[];
    complete: boolean;
}

export class LaserTest extends BaseTest {
    private lines: Line[] = [];
    private usedRows: Set<number> = new Set();
    private usedColumns: Set<number> = new Set();
    private currentLine: Line | null = null;
    private readonly ANIMATION_DURATION = 0.5;  // increased from 1.0 to 3.0 seconds
    private readonly CELL_DELAY = 0.005;         // increased from 0.1 to 0.2 seconds
    private readonly LASER_COLOR = '#FF000044'; // More transparent red (alpha: 44 = ~27%)

    constructor() {
        super({
            worldWidth: 50,
            worldHeight: 25,
            viewportWidth: 50,
            viewportHeight: 25,
            cellWidth: 12,
            cellHeight: 24,
        });
    }

    getName(): string {
        return "laser";
    }

    getDescription(): string {
        return "Demonstrates additive blending with screen blend mode";
    }

    private getRandomLine(): Line | null {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        // Alternate between rows and columns
        const lastType = this.lines.length > 0 ? this.lines[this.lines.length - 1].type : 'column';
        const type = lastType === 'row' ? 'column' : 'row';
        
        if (type === 'row' && this.usedRows.size >= 5) return null;
        if (type === 'column' && this.usedColumns.size >= 5) return null;

        // Get available indices
        let index: number;
        if (type === 'row') {
            const availableRows = Array.from(Array(height).keys())
                .filter(i => !this.usedRows.has(i));
            if (availableRows.length === 0) return null;
            index = availableRows[Math.floor(Math.random() * availableRows.length)];
            this.usedRows.add(index);
        } else {
            const availableColumns = Array.from(Array(width).keys())
                .filter(i => !this.usedColumns.has(i));
            if (availableColumns.length === 0) return null;
            index = availableColumns[Math.floor(Math.random() * availableColumns.length)];
            this.usedColumns.add(index);
        }

        return {
            type,
            index,
            tiles: [],
            complete: false
        };
    }

    private startNewLine() {
        const line = this.getRandomLine();
        if (!line) {
            // All lines complete (5 rows + 5 columns), wait and clear everything
            setTimeout(() => {
                // Clear all existing lines
                this.lines.forEach(line => {
                    line.tiles.forEach(id => this.display.removeTile(id));
                });
                this.lines = [];
                this.usedRows.clear();
                this.usedColumns.clear();
                this.currentLine = null;

                // Wait a moment before starting fresh
                setTimeout(() => this.startNewLine(), 1000);
            }, 1000);
            return;
        }

        this.currentLine = line;
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();
        
        // Create tiles with animations
        const count = line.type === 'row' ? width : height;
        for (let i = 0; i < count; i++) {
            const [x, y] = line.type === 'row' ? 
                [i, line.index] : 
                [line.index, i];

            const tileId = this.display.createTile(
                x, y,
                ' ',
                '#00000000',
                '#FF000000',  // Start fully transparent
                100,
                { blendMode: BlendMode.Screen }
            );

            this.display.addColorAnimation(tileId, {
                bg: {
                    start: '#FF000000',  // Start fully transparent
                    end: this.LASER_COLOR,  // End with semi-transparent red
                    duration: this.ANIMATION_DURATION,
                    progressOffset: i * this.CELL_DELAY,
                    // offset: 0,
                    easing: Easing.quadOut,
                    loop: false
                }
            });

            line.tiles.push(tileId);
        }

        this.lines.push(line);

        // Check when this line is complete
        const totalDuration = this.ANIMATION_DURATION + (count - 1) * this.CELL_DELAY;
        setTimeout(() => {
            if (this.currentLine === line) {
                line.complete = true;
                this.currentLine = null;
                this.startNewLine();
            }
        }, totalDuration * 1000);
    }

    protected run(): void {
        this.display.setBackground(' ', "#000000FF", "#000000FF");
        this.startNewLine();
    }

    protected cleanup(): void {
        this.lines.forEach(line => {
            line.tiles.forEach(id => this.display.removeTile(id));
        });
        this.lines = [];
        this.usedRows.clear();
        this.usedColumns.clear();
        this.currentLine = null;
    }
} 