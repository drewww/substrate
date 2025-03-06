import { Display } from '../../display/display';
import { ChunkMetadata, Direction, RoadWeight, RoadType } from './layout-generator';

export class LayoutRenderer {
    constructor(protected display: Display) {}

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

    protected processRoadConnections(layout: ChunkMetadata[][]): void {
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

    protected renderChunk(chunk: ChunkMetadata, x: number, y: number, options?: {
        color?: string,
        background?: string,
        zIndex?: number
    }): string | null {
        if (chunk.type === 'road') {
            const roadInfo = chunk.roadInfo || { 
                type: 'deadend', 
                weight: 'minor', 
                connections: [] 
            };
            
            const symbol = this.getRoadSymbol(roadInfo.connections, roadInfo.weight);
            
            // Base colors
            const colors = {
                trunk: '#00AAFF',
                medium: '#FFFF00',
                minor: '#FF0000',
            };

            const color = options?.color ?? colors[roadInfo.weight];
            const background = options?.background ?? '#333333';
            const zIndex = options?.zIndex ?? 0;

            return this.display.createTile(x, y, symbol, color, background, zIndex);
        } else {
            return this.display.createTile(
                x, y, '#', 
                options?.color ?? '#666666',
                options?.background ?? '#444444',
                options?.zIndex ?? 0
            );
        }
    }

    renderLayout(layout: ChunkMetadata[][]): void {
        this.processRoadConnections(layout);
        this.display.clear();

        for (let y = 0; y < layout.length; y++) {
            for (let x = 0; x < layout[y].length; x++) {
                this.renderChunk(layout[y][x], x, y);
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