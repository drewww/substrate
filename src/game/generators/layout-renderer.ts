import { Display } from '../../display/display';
import { ChunkMetadata, Direction } from './layout-generator';

export class LayoutRenderer {
    constructor(private display: Display) {}

    private getRoadSymbol(connections: Direction[]): string {
        // Sort connections alphabetically to ensure consistent key generation
        const sortedKey = [...connections].sort().join(',');

        // Create map with alphabetically sorted keys
        const symbolMap: Record<string, string> = {
            // Single connections (dead ends)
            'north': '║',
            'south': '║',
            'east': '═',
            'west': '═',

            // Straight sections
            'north,south': '║',
            'east,west': '═',

            // Corners/Turns
            'east,south': '╔',
            'south,west': '╗',
            'east,north': '╚',
            'north,west': '╝',

            // T-junctions
            'east,south,west': '╦',
            'east,north,west': '╩',
            'east,north,south': '╠',
            'north,south,west': '╣',

            // Four-way intersection
            'east,north,south,west': '╬'
        };

        const symbol = symbolMap[sortedKey];
        if (!symbol) {
            console.warn(`Unknown road configuration: ${sortedKey}`);
            return '○';
        }
        return symbol;
    }

    renderLayout(layout: ChunkMetadata[][]): void {
        // Clear the display
        this.display.clear();

        // Render each cell based on its metadata
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                const metadata = layout[y][x];
                
                if (metadata.type === 'road') {
                    const symbol = metadata.roadInfo ? 
                        this.getRoadSymbol(metadata.roadInfo.connections) : 
                        '○';
                    
                    // Use a single color for all roads
                    this.display.createTile(
                        x,
                        y,
                        symbol,
                        '#AAAAAA',  // Single road color
                        '#333333'   // Background color
                    );
                } else {
                    this.display.createTile(
                        x,
                        y,
                        '#',
                        '#666666',
                        '#444444'
                    );
                }
            }
        }
    }
} 