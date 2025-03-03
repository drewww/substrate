import { Display } from '../../display/display';
import { ChunkMetadata, Direction, RoadWeight, RoadType } from './layout-generator';

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

    private processRoadConnections(layout: ChunkMetadata[][]): void {
        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                if (layout[y][x].type === 'road') {
                    // Find connected roads
                    const connections: Direction[] = [];
                    if (y > 0 && layout[y-1][x].type === 'road') connections.push('north');
                    if (x < layout[y].length-1 && layout[y][x+1].type === 'road') connections.push('east');
                    if (y < layout.length-1 && layout[y+1][x].type === 'road') connections.push('south');
                    if (x > 0 && layout[y][x-1].type === 'road') connections.push('west');

                    // Determine road type based on connections
                    let roadType: RoadType;
                    switch (connections.length) {
                        case 1:
                            roadType = 'deadend';
                            break;
                        case 2:
                            roadType = (connections.includes('north') && connections.includes('south')) ||
                                     (connections.includes('east') && connections.includes('west'))
                                     ? 'straight' : 'turn';
                            break;
                        case 3:
                        case 4:
                            roadType = 'intersection';
                            break;
                        default:
                            roadType = 'deadend';
                    }

                    // Update the road info with connections and type
                    const roadInfo = layout[y][x].roadInfo;
                    if (roadInfo) {
                        roadInfo.type = roadType;
                        roadInfo.connections = connections;
                    }
                }
            }
        }
    }

    renderLayout(layout: ChunkMetadata[][]): void {
        // Process road connections before rendering
        this.processRoadConnections(layout);

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
                    
                    // Base colors
                    const colors = {
                        trunk: '#00AAFF',  // Bright blue
                        medium: '#FFFF00',  // Yellow
                        minor: '#FF0000',   // Red
                    };

                    let color = colors[roadInfo.weight];

                    // Special coloring for intersections
                    if (roadInfo.type === 'intersection') {
                        if (roadInfo.weight === 'trunk') {
                            // Keep trunk-trunk intersections blue
                            color = '#00AAFF';  // Blue
                        } else if (roadInfo.weight === 'medium') {
                            // Keep medium-medium intersections yellow
                            color = '#FFFF00';  // Yellow
                        } else if (roadInfo.weight === 'minor') {
                            color = '#FFA500';  // Orange for minor intersections
                        }

                        // If it's a trunk-medium intersection, make it green
                        if ((roadInfo.weight === 'trunk' || roadInfo.weight === 'medium') &&
                            this.hasDifferentWeightConnections(layout, x, y)) {
                            color = '#00FF00';  // Green
                        }
                    }

                    this.display.createTile(x, y, symbol, color, '#333333');
                } else {
                    this.display.createTile(x, y, '#', '#666666', '#444444');
                }
            }
        }
    }

    // Add this helper method to check if an intersection connects different weight roads
    private hasDifferentWeightConnections(layout: ChunkMetadata[][], x: number, y: number): boolean {
        const currentWeight = layout[y][x].roadInfo?.weight;
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;
            
            if (newX >= 0 && newX < layout[0].length && 
                newY >= 0 && newY < layout.length && 
                layout[newY][newX].type === 'road') {
                const neighborWeight = layout[newY][newX].roadInfo?.weight;
                if (neighborWeight && neighborWeight !== currentWeight) {
                    return true;
                }
            }
        }
        
        return false;
    }
} 