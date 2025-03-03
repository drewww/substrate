import { ChunkMetadata, Direction, RoadType, RoadWeight } from './layout-generator';

// Define L-System rules
interface LSystemRule {
    predecessor: string;
    successor: string;
    probability?: number; // Optional probability for stochastic L-systems
}

// Define turtle state for interpreting L-System strings
interface TurtleState {
    x: number;
    y: number;
    direction: number;
    weight: RoadWeight;
}

export class LSystemLayoutGenerator {
    private width: number;
    private height: number;
    private layout!: ChunkMetadata[][];
    private readonly DIRECTIONS = [
        [0, -1], // North
        [1, 0],  // East
        [0, 1],  // South
        [-1, 0]  // West
    ];
    
    // L-System parameters
    private axiom: string = 'o';    // o for original
    private rules: LSystemRule[] = [
        { predecessor: 'o', successor: '[tT]+[tT]+[tT]+[tT]' }, 
        { predecessor: 'T', successor: 'tT', probability: 0.7 },
        { predecessor: 'T', successor: 't+[tT]tT', probability: 0.1 },
        { predecessor: 'T', successor: 't-[tT]tT', probability: 0.1 },
        { predecessor: 'T', successor: 't', probability: 0.05 }, // just end the road
        { predecessor: 'T', successor: 'M', probability: 0.05 }, // just end the road
        // { predecessor: 'M', successor: 'mM', probability: 0.7 },
        // { predecessor: 'M', successor: 'm+[M]M', probability: 0.1 },
        // { predecessor: 'M', successor: 'm-[M]M', probability: 0.1 },
        // { predecessor: 'M', successor: 'L', probability: 0.05 }, // just end the road
        
        // { predecessor: 'L', successor: 'lL', probability: 0.7 },
        // { predecessor: 'L', successor: 'l+[L]L', probability: 0.1 },
        // { predecessor: 'L', successor: 'l-[L]L', probability: 0.1 },
        // { predecessor: 'L', successor: 'l', probability: 0.05 }, // just end the road
    ];
    private iterations: number = 200;
    
    // Add these properties to track the current state
    private currentIteration: number = 0;
    private currentLSystemString: string = '';
    private isGenerationComplete: boolean = false;
    
    // Add a property to store the starting position
    private startX: number = 0;
    private startY: number = 0;
    
    // Add these properties to the class
    private readonly EDGE_MARGIN = 1; // How close to edge before we consider it an edge tile
    private readonly edgeRules: LSystemRule[] = [
        { predecessor: 'T', successor: 't+T', probability: 0.5 },  // Turn right
        { predecessor: 'T', successor: 't-T', probability: 0.5 },  // Turn left
        { predecessor: 'T', successor: 't+[tT]t-[tT]', probability: 0.3 }, // Split
        { predecessor: 'T', successor: 't', probability: 0.2 }, // End the road
    ];
    
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.reset();
    }
    
    private reset(): void {
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
        
        // Choose a random starting point (not within 2 of an edge)
        this.startX = Math.floor(Math.random() * (this.width - 4)) + 2;
        this.startY = Math.floor(Math.random() * (this.height - 4)) + 2;
        
        console.log(`Starting point: (${this.startX}, ${this.startY})`);
        
        // Reset L-System state
        this.currentIteration = 0;
        this.currentLSystemString = this.axiom;
        this.isGenerationComplete = false;
    }
    
    // Interpret L-System string to create road layout
    private interpretLSystem(lSystemString: string): void {
        // Start at the random position
        const turtle: TurtleState = {
            x: this.startX,
            y: this.startY,
            direction: 0, // Start facing north
            weight: 'trunk'
        };
        
        // Stack for branching
        const stack: TurtleState[] = [];
        
        // Place initial road
        this.placeRoad(turtle.x, turtle.y, turtle.weight);
        
        // Interpret each character in the L-System string
        for (const char of lSystemString) {
            switch (char) {
                case 'f': // Move forward and draw ('f' just means a non-branch-eligible road. it's locked in.)
                case 'F': // Move forward and draw
                    const nextX = turtle.x + this.DIRECTIONS[turtle.direction][0];
                    const nextY = turtle.y + this.DIRECTIONS[turtle.direction][1];
                    
                    // Check if within bounds
                    if (this.isValidPosition(nextX, nextY)) {
                        turtle.x = nextX;
                        turtle.y = nextY;
                        this.placeRoad(turtle.x, turtle.y, turtle.weight);
                    }
                    break;
                    
                case '+': // Turn right (clockwise)
                    turtle.direction = (turtle.direction + 1) % 4;
                    break;
                    
                case '-': // Turn left (counter-clockwise)
                    turtle.direction = (turtle.direction + 3) % 4; // Same as -1 but avoids negative
                    break;
                    
                case '[': // Save state (branch)
                    stack.push({...turtle}); // Clone current state
                    break;
                    
                case ']': // Pop state from stack
                    if (stack.length > 0) {
                        const savedState = stack.pop()!;
                        turtle.x = savedState.x;
                        turtle.y = savedState.y;
                        turtle.direction = savedState.direction;
                        turtle.weight = savedState.weight;
                    }
                    break;
                    
                case 'T': // Go forward with trunk weight
                    this.placeRoad(turtle.x, turtle.y, 'trunk');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
                    
                case 'M': // Go forward with medium weight
                    this.placeRoad(turtle.x, turtle.y, 'medium');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
                    
                case 'L': // Go forward with local/minor weight
                    this.placeRoad(turtle.x, turtle.y, 'minor');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
                    
                case 't': // Go forward with trunk weight (locked, won't be replaced)
                    this.placeRoad(turtle.x, turtle.y, 'trunk');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
                    
                case 'm': // Go forward with medium weight (locked, won't be replaced)
                    this.placeRoad(turtle.x, turtle.y, 'medium');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
                    
                case 'l': // Go forward with local/minor weight (locked, won't be replaced)
                    this.placeRoad(turtle.x, turtle.y, 'minor');
                    turtle.x += this.DIRECTIONS[turtle.direction][0];
                    turtle.y += this.DIRECTIONS[turtle.direction][1];
                    break;
            }
        }
    }
    
    private placeRoad(x: number, y: number, weight: RoadWeight): void {
        if (!this.isValidPosition(x, y)) return;
        
        this.layout[y][x] = {
            type: 'road',
            roadInfo: {
                type: 'straight', // Will be updated in postProcess
                weight: weight,
                connections: [] // Will be updated in postProcess
            }
        };
    }
    
    private isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }
    
    // Process the layout to set correct road types and connections
    private postProcess(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.layout[y][x].type === 'road' && this.layout[y][x].roadInfo) {
                    const connections: Direction[] = [];
                    
                    // Check all four directions
                    if (y > 0 && this.layout[y-1][x].type === 'road') connections.push('north');
                    if (x < this.width-1 && this.layout[y][x+1].type === 'road') connections.push('east');
                    if (y < this.height-1 && this.layout[y+1][x].type === 'road') connections.push('south');
                    if (x > 0 && this.layout[y][x-1].type === 'road') connections.push('west');
                    
                    // Determine road type based on connections
                    let roadType: RoadType = 'deadend';
                    if (connections.length === 2) {
                        if ((connections.includes('north') && connections.includes('south')) || 
                            (connections.includes('east') && connections.includes('west'))) {
                            roadType = 'straight';
                        } else {
                            roadType = 'turn';
                        }
                    } else if (connections.length === 3) {
                        roadType = 'intersection';
                    } else if (connections.length === 4) {
                        roadType = 'intersection';
                    } else if (connections.length === 1) {
                        roadType = 'deadend';
                    }
                    
                    // Update road info
                    const roadInfo = this.layout[y][x].roadInfo;
                    if (roadInfo) {
                        roadInfo.type = roadType;
                        roadInfo.connections = connections;
                    }
                }
            }
        }
    }
    
    // Public methods
    step(): boolean {
        if (this.isGenerationComplete) return false;
        
        if (this.currentIteration >= this.iterations) {
            // Reset the layout
            this.layout = Array(this.height).fill(null).map(() => 
                Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
            );
            
            // Interpret the final L-System string
            this.interpretLSystem(this.currentLSystemString);
            
            // Post-process to set correct road types and connections
            this.postProcess();
            
            // Mark generation as complete
            this.isGenerationComplete = true;
            
            // Output the final layout
            console.log("Final L-System string:", this.currentLSystemString);
            console.log(this.getSymbolOutput());
            
            return true;
        }
        
        let nextString = '';
        let currentX = this.startX;
        let currentY = this.startY;
        let currentDirection = 0;
        
        for (const char of this.currentLSystemString) {
            let replaced = false;
            
            // Update position based on current character
            if (['T', 'M', 'L', 't', 'm', 'l'].includes(char)) {
                currentX += this.DIRECTIONS[currentDirection][0];
                currentY += this.DIRECTIONS[currentDirection][1];
            } else if (char === '+') {
                currentDirection = (currentDirection + 1) % 4;
            } else if (char === '-') {
                currentDirection = (currentDirection + 3) % 4;
            }
            
            // Choose rules based on whether we're in an edge tile
            const rules = this.isEdgeTile(currentX, currentY) ? this.edgeRules : this.rules;
            
            // Apply rules
            for (const rule of rules) {
                if (char === rule.predecessor) {
                    if (!rule.probability || Math.random() < rule.probability) {
                        nextString += rule.successor;
                        replaced = true;
                        break;
                    }
                }
            }
            
            if (!replaced) {
                nextString += char;
            }
        }
        
        // Update current string and iteration
        this.currentLSystemString = nextString;
        this.currentIteration++;
        
        // Clear the layout and render the current state
        this.layout = Array(this.height).fill(null).map(() => 
            Array(this.width).fill(null).map(() => ({ type: 'building' as const }))
        );
        
        // Interpret the current L-System string
        this.interpretLSystem(this.currentLSystemString);
        
        // Post-process to set correct road types and connections
        this.postProcess();
        
        // Output the current state
        console.log(`Iteration ${this.currentIteration}/${this.iterations}, L-System string:`, this.currentLSystemString);
        console.log(this.getSymbolOutput());
        
        return true;
    }
    
    generate(): ChunkMetadata[][] {
        this.reset();
        
        // Run all steps until completion
        while (this.step()) {}
        
        return this.layout;
    }
    
    getCurrentLayout(): ChunkMetadata[][] {
        return this.layout;
    }
    
    // Helper method to visualize the layout
    private getSymbolOutput(): string {
        let output = '';
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                if (cell.type === 'road' && cell.roadInfo) {
                    row += this.getRoadSymbol(cell.roadInfo.connections, cell.roadInfo.weight);
                } else {
                    row += '#';
                }
            }
            output += row + '\n';
        }
        return output;
    }
    
    private getRoadSymbol(connections: Direction[], weight: RoadWeight): string {
        // Sort connections for consistent key generation
        const sortedConnections = [...connections].sort();
        const sortedKey = sortedConnections.join(',');
        
        const symbolMap: Record<string, Record<RoadWeight, string>> = {
            'north,south': {
                trunk: '┃',
                medium: '│',
                minor: '╎'
            },
            'east,west': {
                trunk: '━',
                medium: '─',
                minor: '╌'
            },
            'east,north,south,west': {
                trunk: '╋',
                medium: '┼',
                minor: '┽'
            },
            'north': {
                trunk: '╹',
                medium: '╵',
                minor: '⋮'
            },
            'east': {
                trunk: '╺',
                medium: '╴',
                minor: '⋯'
            },
            'south': {
                trunk: '╻',
                medium: '╷',
                minor: '⋮'
            },
            'west': {
                trunk: '╸',
                medium: '╶',
                minor: '⋯'
            },
            'north,east': {
                trunk: '┗',
                medium: '└',
                minor: '┖'
            },
            'east,south': {
                trunk: '┏',
                medium: '┌',
                minor: '┎'
            },
            'south,west': {
                trunk: '┓',
                medium: '┐',
                minor: '┒'
            },
            'north,west': {
                trunk: '┛',
                medium: '┘',
                minor: '┚'
            },
            'east,north,south': {
                trunk: '┣',
                medium: '├',
                minor: '┞'
            },
            'east,south,west': {
                trunk: '┳',
                medium: '┬',
                minor: '┰'
            },
            'north,south,west': {
                trunk: '┫',
                medium: '┤',
                minor: '┦'
            },
            'north,east,west': {
                trunk: '┻',
                medium: '┴',
                minor: '┸'
            }
        };
        
        return symbolMap[sortedKey]?.[weight] ?? '○';
    }
    
    // Add this helper method
    private isEdgeTile(x: number, y: number): boolean {
        return x <= this.EDGE_MARGIN || 
               x >= this.width - this.EDGE_MARGIN || 
               y <= this.EDGE_MARGIN || 
               y >= this.height - this.EDGE_MARGIN;
    }
} 