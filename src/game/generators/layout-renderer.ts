import { Display } from '../../display/display';
import { ChunkMetadata, Direction, RoadWeight } from './layout-generator';

export class LayoutRenderer {
    constructor(private display: Display) {}

    private getRoadSymbol(connections: Direction[], weight: RoadWeight = 'minor'): string {
        // Handle empty connections array
        if (!connections || connections.length === 0) {
            return '•'; // or some other placeholder for roads without connections
        }

        const key = [...connections].sort((a, b) => a.localeCompare(b)).join(',');
        
        // Complete map of all possible configurations
        const symbolMap: Record<string, Record<RoadWeight, string>> = {
            // Single connections (dead ends)
            'north': { trunk: '║', medium: '│', minor: '╎' },
            'south': { trunk: '║', medium: '│', minor: '╎' },
            'east': { trunk: '═', medium: '─', minor: '╌' },
            'west': { trunk: '═', medium: '─', minor: '╌' },

            // Straight sections
            'north,south': { trunk: '║', medium: '│', minor: '╎' },
            'east,west': { trunk: '═', medium: '─', minor: '╌' },

            // Corners/Turns
            'east,north': { trunk: '╚', medium: '└', minor: '└' },     // Changed order
            'east,south': { trunk: '╔', medium: '┌', minor: '┌' },
            'north,west': { trunk: '╝', medium: '┘', minor: '┘' },
            'south,west': { trunk: '╗', medium: '┐', minor: '┐' },

            // T-junctions
            'east,north,west': { trunk: '╩', medium: '┴', minor: '┴' }, // Changed order
            'east,south,west': { trunk: '╦', medium: '┬', minor: '┬' },
            'east,north,south': { trunk: '╠', medium: '├', minor: '├' },
            'north,south,west': { trunk: '╣', medium: '┤', minor: '┤' },

            // Four-way intersection
            'east,north,south,west': { trunk: '╬', medium: '┼', minor: '┼' }
        };

        const symbolSet = symbolMap[key];
        if (!symbolSet) {
            console.warn(`Unknown road configuration: ${key}, sorted from [${connections.join(',')}]`);
            return '○';
        }
        return symbolSet[weight];
    }

    renderLayout(layout: ChunkMetadata[][]): void {
        // Clear the display
        this.display.clear();

        // Render each cell based on its metadata
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                const metadata = layout[y][x];
                
                if (metadata.type === 'road') {
                    // Ensure roadInfo exists
                    const roadInfo = metadata.roadInfo || { 
                        type: 'deadend', 
                        weight: 'minor', 
                        connections: [] 
                    };
                    
                    const symbol = this.getRoadSymbol(roadInfo.connections, roadInfo.weight);
                    
                    // Color based on weight
                    let color = '#666666';
                    switch (roadInfo.weight) {
                        case 'trunk':
                            color = '#FFFFFF';
                            break;
                        case 'medium':
                            color = '#AAAAAA';
                            break;
                        case 'minor':
                            color = '#666666';
                            break;
                    }

                    this.display.createTile(x, y, symbol, color, '#333333');
                } else {
                    this.display.createTile(x, y, '#', '#666666', '#444444');
                }
            }
        }
    }
} 