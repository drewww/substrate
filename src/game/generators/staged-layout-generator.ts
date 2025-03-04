import { ChunkMetadata, Direction, RoadType, RoadWeight } from './layout-generator';

// Define an enum for step outcomes
enum StepOutcome {
    CONTINUE, // Continue generating
    RESET,    // Reset with a new branch point
    DONE      // Generation is complete
}

export class StagedLayoutGenerator {
    private width: number;
    private height: number;
    private layout!: ChunkMetadata[][];
    private readonly DIRECTIONS = [
        [0, -1], // North
        [1, 0],  // East
        [0, 1],  // South
        [-1, 0]  // West
    ];
    
    // Phase tracking
    private currentPhase: 'trunk' | 'medium' | 'minor' = 'trunk';
    private startX: number = 0;
    private startY: number = 0;
    private currentDirection: number = 0;
    private currentLength: number = 0;
    private readonly MIN_TRUNK_LENGTH = 6;
    private readonly TRUNK_CONTINUE_CHANCE = 0.95; // Base chance to continue
    private readonly TRUNK_CONTINUE_DECREASE = 0.02; // Increase per tile beyond 4

    // Add these new properties
    private readonly MAX_TRUNK_TILES = 80;
    private trunkTilesPlaced = 0;
    private unexploredDirections: number[] = [0, 1, 2, 3]; // Cardinal directions to explore from origin
    private originX: number = 0;
    private originY: number = 0;

    // Add these properties for medium roads
    private readonly MIN_MEDIUM_SPACE = 3; // Minimum space needed for medium roads
    private readonly MEDIUM_DENSITY_RADIUS = 3;
    private readonly MEDIUM_BASE_TURN_CHANCE = 0.1;  // 10% base chance to turn
    private readonly MEDIUM_TURN_INCREASE = 0.15;    // Increase chance by 15% if turned last time
    private readonly MIN_DISTANCE_FROM_TRUNK = 2;    // Minimum distance to maintain from trunk roads
    private lastTurned: boolean = false;             // Track if we turned last time

    // Add these properties for minor roads near the other road properties
    private readonly MINOR_MAX_LENGTH = 4;  // Maximum length for minor roads
    private readonly MINOR_CONTINUE_CHANCE = 0.7;  // 70% chance to continue

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
        this.originX = Math.floor(Math.random() * (this.width - 6)) + 3;
        this.originY = Math.floor(Math.random() * (this.height - 6)) + 3;
        
        // Reset all tracking variables
        this.startX = this.originX;
        this.startY = this.originY;
        this.currentDirection = 0;
        this.currentLength = 0;
        this.trunkTilesPlaced = 0;
        this.unexploredDirections = [0, 1, 2, 3];
        
        // Place the origin point
        this.placeRoad(this.originX, this.originY, 'trunk');
        this.trunkTilesPlaced++;
    }

    private placeRoad(x: number, y: number, weight: RoadWeight): void {
        if (!this.isValidPosition(x, y)) return;
        
        this.layout[y][x] = {
            type: 'road',
            roadInfo: {
                type: 'straight', // Will be updated in post-processing
                weight: weight,
                connections: [] // Will be updated in post-processing
            }
        };
    }

    private processRoadConnections(x: number, y: number): void {
        const cell = this.layout[y][x];
        if (cell.type !== 'road' || !cell.roadInfo) return;

        // Find connected roads
        const connections: Direction[] = [];
        if (y > 0 && this.layout[y-1][x].type === 'road') connections.push('north');
        if (x < this.width-1 && this.layout[y][x+1].type === 'road') connections.push('east');
        if (y < this.height-1 && this.layout[y+1][x].type === 'road') connections.push('south');
        if (x > 0 && this.layout[y][x-1].type === 'road') connections.push('west');

        // Determine road type based on connections
        let roadType: RoadType;
        let orientation: number = 0; // 0 = N/S, 1 = E/W, 2 = S/N, 3 = W/E

        switch (connections.length) {
            case 1:
                roadType = 'deadend';
                // For dead ends, orient towards the connection
                if (connections[0] === 'north') orientation = 0;
                else if (connections[0] === 'east') orientation = 1;
                else if (connections[0] === 'south') orientation = 2;
                else if (connections[0] === 'west') orientation = 3;
                break;
            case 2:
                if ((connections.includes('north') && connections.includes('south')) ||
                    (connections.includes('east') && connections.includes('west'))) {
                    roadType = 'straight';
                    // For straight roads, orient based on direction
                    if (connections.includes('north')) orientation = 2;
                    else if (connections.includes('east')) orientation = 1;
                    else if (connections.includes('south')) orientation = 0;
                    else if (connections.includes('west')) orientation = 3;
                } else {
                    roadType = 'turn';
                    // For turns, orient based on the turn direction relative to S/E template
                    if (connections.includes('south') && connections.includes('east')) orientation = 0;      // S/E template
                    else if (connections.includes('east') && connections.includes('north')) orientation = 3;  // E/N -> rotate 270° clockwise (flipped from 1)
                    else if (connections.includes('north') && connections.includes('west')) orientation = 2;  // N/W -> rotate 180°
                    else if (connections.includes('west') && connections.includes('south')) orientation = 1;  // W/S -> rotate 90° clockwise (flipped from 3)
                }
                break;
            case 3:
                roadType = 'intersection';
                // For 3-way intersections, orient based on the missing direction
                if (!connections.includes('north')) orientation = 0;      // T facing down (template)
                else if (!connections.includes('east')) orientation = 1;  // T facing left
                else if (!connections.includes('south')) orientation = 2; // T facing up
                else if (!connections.includes('west')) orientation = 3;  // T facing right
                break;
            case 4:
                roadType = 'intersection';
                // For 4-way intersections, orient based on the first connection
                if (connections[0] === 'north') orientation = 0;
                else if (connections[0] === 'east') orientation = 1;
                else if (connections[0] === 'south') orientation = 2;
                else if (connections[0] === 'west') orientation = 3;
                break;
            default:
                roadType = 'unknown';
        }

        // Update the road info
        cell.roadInfo.type = roadType;
        cell.roadInfo.connections = connections;
        cell.roadInfo.orientation = orientation;
    }

    private isValidPosition(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    private isEdgeTile(x: number, y: number): boolean {
        return x === 0 || x === this.width - 1 || y === 0 || y === this.height - 1;
    }

    private isCornerTile(x: number, y: number): boolean {
        return (x === 0 || x === this.width - 1) && (y === 0 || y === this.height - 1);
    }

    private handleEdgeIntersection(x: number, y: number): void {
        if (this.isCornerTile(x, y)) {
            // At a corner, follow the corner
            const nextDirection = (this.currentDirection + 1) % 4;
            this.currentDirection = nextDirection;
            this.currentLength = 0;
            return;
        }

        // At a regular edge, choose between T-intersection or turn
        if (Math.random() < 0.5) {
            // T-intersection
            const leftDir = (this.currentDirection + 3) % 4;
            const rightDir = (this.currentDirection + 1) % 4;
            const nextDir = Math.random() < 0.5 ? leftDir : rightDir;
            this.currentDirection = nextDir;
        } else {
            // Turn
            const turnDir = Math.random() < 0.5 ? 
                (this.currentDirection + 1) % 4 : // Turn right
                (this.currentDirection + 3) % 4;  // Turn left
            this.currentDirection = turnDir;
        }
        this.currentLength = 0;
    }

    // Add this helper method to check if a point is part of a straight trunk segment
    private isStraightTrunkSegment(x: number, y: number): boolean {
        const cell = this.layout[y][x];
        if (cell.type !== 'road' || !cell.roadInfo || cell.roadInfo.weight !== 'trunk') {
            return false;
        }

        // Check horizontal straight
        const isHorizontalStraight = 
            this.isRoadOfType(x - 1, y, 'trunk') && 
            this.isRoadOfType(x + 1, y, 'trunk') &&
            !this.isRoadOfType(x, y - 1, 'trunk') && 
            !this.isRoadOfType(x, y + 1, 'trunk');

        // Check vertical straight
        const isVerticalStraight = 
            this.isRoadOfType(x, y - 1, 'trunk') && 
            this.isRoadOfType(x, y + 1, 'trunk') &&
            !this.isRoadOfType(x - 1, y, 'trunk') && 
            !this.isRoadOfType(x + 1, y, 'trunk');

        return isHorizontalStraight || isVerticalStraight;
    }

    // Helper to check if a position has a road of specific weight
    private isRoadOfType(x: number, y: number, weight: RoadWeight): boolean {
        if (!this.isValidPosition(x, y)) return false;
        const cell = this.layout[y][x];
        return cell.type === 'road' && cell.roadInfo?.weight === weight;
    }

    // Modify startNewTrunk to consider all valid trunk points
    private startNewTrunk(): boolean {
        // Collect all valid trunk points
        const validTrunkPoints: Array<{x: number, y: number}> = [];
        
        // Always include the origin
        validTrunkPoints.push({ x: this.originX, y: this.originY });
        
        // Find other valid trunk points
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.isStraightTrunkSegment(x, y)) {
                    validTrunkPoints.push({ x, y });
                }
            }
        }

        console.log(`Found ${validTrunkPoints.length} valid trunk points`);
        
        if (validTrunkPoints.length === 0) {
            console.log('No valid trunk points found');
            return false;
        }

        // For each trunk point, find valid directions that wouldn't create a 2x2 block
        const validOptions: Array<{point: {x: number, y: number}, direction: number}> = [];
        
        for (const point of validTrunkPoints) {
            // Check all four directions
            for (let dir = 0; dir < 4; dir++) {
                const nextX = point.x + this.DIRECTIONS[dir][0];
                const nextY = point.y + this.DIRECTIONS[dir][1];
                
                // Check if this direction would be valid
                if (this.isValidPosition(nextX, nextY) && 
                    !this.wouldCreateRoadBlock(nextX, nextY) &&
                    this.layout[nextY][nextX].type !== 'road') {
                    validOptions.push({
                        point: point,
                        direction: dir
                    });
                }
            }
        }

        console.log(`Found ${validOptions.length} valid branching options`);
        
        if (validOptions.length === 0) {
            console.log('No valid branching options found');
            return false;
        }

        // Pick a random valid option
        const chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
        
        // Set new position and direction
        this.startX = chosen.point.x;
        this.startY = chosen.point.y;
        this.currentDirection = chosen.direction;
        this.currentLength = 0;
        
        console.log(`Starting new trunk at (${this.startX}, ${this.startY}) in direction ${this.currentDirection}`);
        
        return true;
    }

    private wouldCreateRoadBlock(x: number, y: number): boolean {
        // Check all possible 2x2 blocks this tile could be part of
        for (let offsetY = -1; offsetY <= 0; offsetY++) {
            for (let offsetX = -1; offsetX <= 0; offsetX++) {
                let allRoads = true;
                
                // Check each position in the 2x2 block
                for (let dy = 0; dy < 2; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const checkX = x + offsetX + dx;
                        const checkY = y + offsetY + dy;
                        
                        if (checkX < 0 || checkX >= this.width || 
                            checkY < 0 || checkY >= this.height) {
                            allRoads = false;
                            break;
                        }
                        
                        // Check if this position would be a road
                        // (either it's the position we're checking, or it's already a road)
                        const cell = this.layout[checkY][checkX];
                        if (cell.type !== 'road' && (checkX !== x || checkY !== y)) {
                            allRoads = false;
                            break;
                        }
                    }
                    if (!allRoads) break;
                }
                
                if (allRoads) return true;
            }
        }
        return false;
    }

    private isMediumBranchPoint(x: number, y: number, direction: number): boolean {
        const cell = this.layout[y][x];
        if (cell.type !== 'road' || !cell.roadInfo || cell.roadInfo.weight !== 'trunk') {
            return false;
        }

        // Check if there's enough space in the given direction
        let spaceCount = 0;
        let checkX = x + this.DIRECTIONS[direction][0];
        let checkY = y + this.DIRECTIONS[direction][1];

        while (this.isValidPosition(checkX, checkY) && 
               this.layout[checkY][checkX].type === 'building' &&
               spaceCount < this.MIN_MEDIUM_SPACE) {
            spaceCount++;
            checkX += this.DIRECTIONS[direction][0];
            checkY += this.DIRECTIONS[direction][1];
        }

        return spaceCount >= this.MIN_MEDIUM_SPACE;
    }

    private startNewMedium(): boolean {
        // Find all valid trunk points that have enough space for a medium road
        const validOptions: Array<{point: {x: number, y: number}, direction: number}> = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Check all four directions from trunk roads
                for (let dir = 0; dir < 4; dir++) {
                    if (this.isMediumBranchPoint(x, y, dir)) {
                        const nextX = x + this.DIRECTIONS[dir][0];
                        const nextY = y + this.DIRECTIONS[dir][1];
                        
                        // Add density check here too
                        if (!this.wouldCreateRoadBlock(nextX, nextY) && 
                            this.checkMediumRoadDensity(nextX, nextY)) {
                            validOptions.push({
                                point: { x, y },
                                direction: dir
                            });
                        }
                    }
                }
            }
        }

        console.log(`Found ${validOptions.length} valid medium road branch points`);
        
        if (validOptions.length === 0) {
            console.log('No valid medium branch points found');
            return false;
        }

        // Pick a random valid option
        const chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
        
        // Set new position and direction
        this.startX = chosen.point.x;
        this.startY = chosen.point.y;
        this.currentDirection = chosen.direction;
        this.currentLength = 0;
        
        console.log(`Starting new medium road at (${this.startX}, ${this.startY}) in direction ${this.currentDirection}`);
        
        return true;
    }

    private wouldHitExistingRoad(x: number, y: number): boolean {
        return this.isValidPosition(x, y) && 
               this.layout[y][x].type === 'road';
    }

    private checkMediumRoadDensity(x: number, y: number): boolean {
        let roadCount = 0;
        const maxAllowedRoads = 3; // Maximum number of existing roads allowed in the area

        // Check surrounding area
        for (let dy = -this.MEDIUM_DENSITY_RADIUS; dy <= this.MEDIUM_DENSITY_RADIUS; dy++) {
            for (let dx = -this.MEDIUM_DENSITY_RADIUS; dx <= this.MEDIUM_DENSITY_RADIUS; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (this.isValidPosition(checkX, checkY) && 
                    this.layout[checkY][checkX].type === 'road' &&
                    this.layout[checkY][checkX].roadInfo?.weight === 'medium') {
                    roadCount++;
                    if (roadCount > maxAllowedRoads) {
                        return false; // Too many medium roads in the area
                    }
                }
            }
        }
        
        return true; // Area is not too dense with medium roads
    }

    private isMinorBranchPoint(x: number, y: number, direction: number): boolean {
        const cell = this.layout[y][x];
        if (cell.type !== 'road' || !cell.roadInfo || cell.roadInfo.weight !== 'medium') {
            return false;
        }

        let spaceCount = 0;
        let checkX = x + this.DIRECTIONS[direction][0];
        let checkY = y + this.DIRECTIONS[direction][1];

        while (this.isValidPosition(checkX, checkY) && 
               this.layout[checkY][checkX].type === 'building' &&
               spaceCount < this.MIN_MEDIUM_SPACE) {  // We can reuse the same minimum space
            spaceCount++;
            checkX += this.DIRECTIONS[direction][0];
            checkY += this.DIRECTIONS[direction][1];
        }

        return spaceCount >= this.MIN_MEDIUM_SPACE;
    }

    private startNewMinor(): boolean {
        const validOptions: Array<{point: {x: number, y: number}, direction: number}> = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                for (let dir = 0; dir < 4; dir++) {
                    if (this.isMinorBranchPoint(x, y, dir)) {
                        const nextX = x + this.DIRECTIONS[dir][0];
                        const nextY = y + this.DIRECTIONS[dir][1];
                        
                        if (!this.wouldCreateRoadBlock(nextX, nextY)) {
                            validOptions.push({
                                point: { x, y },
                                direction: dir
                            });
                        }
                    }
                }
            }
        }

        if (validOptions.length === 0) {
            return false;
        }

        const chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
        this.startX = chosen.point.x;
        this.startY = chosen.point.y;
        this.currentDirection = chosen.direction;
        this.currentLength = 0;
        
        return true;
    }

    step(): StepOutcome {
        if (this.currentPhase === 'trunk') {
            if (this.trunkTilesPlaced >= this.MAX_TRUNK_TILES) {
                console.log(`Ending trunk phase: Hit max trunk tiles (${this.trunkTilesPlaced}/${this.MAX_TRUNK_TILES})`);
                this.currentPhase = 'medium';  // Transition to medium phase
                return StepOutcome.CONTINUE;   // Continue with new phase
            }

            // Calculate next position
            const nextX = this.startX + this.DIRECTIONS[this.currentDirection][0];
            const nextY = this.startY + this.DIRECTIONS[this.currentDirection][1];
            
            // Check if placing a road at the next position would create a 2x2 block
            if (this.wouldCreateRoadBlock(nextX, nextY)) {
                console.log(`Would create a 2x2 block at (${nextX}, ${nextY}), ending trunk`);
                return StepOutcome.RESET; // End this trunk and start a new one
            }

            // Place current road
            this.placeRoad(this.startX, this.startY, 'trunk');
            this.trunkTilesPlaced++;
            
            console.log(`Placed trunk tile ${this.trunkTilesPlaced}/${this.MAX_TRUNK_TILES} at (${this.startX}, ${this.startY})`);
            console.log(`Current length: ${this.currentLength}, Direction: ${this.currentDirection}`);
            console.log(`Unexplored directions: ${this.unexploredDirections.join(', ')}`);
            
            // Check if we should continue
            if (this.isValidPosition(nextX, nextY)) {
                this.currentLength++;
                
                // If we've reached minimum length, check if we should continue
                if (this.currentLength >= this.MIN_TRUNK_LENGTH) {
                    const continueChance = this.TRUNK_CONTINUE_CHANCE -
                        (this.currentLength - 6) * this.TRUNK_CONTINUE_DECREASE;
                    
                    console.log(`Continue chance: ${continueChance} at length ${this.currentLength}`);
                    
                    if (Math.random() > continueChance) {
                        console.log('Failed continue check, starting new trunk');
                        // End this trunk and start a new one
                        return StepOutcome.RESET; // Indicate reset
                    }
                }
                
                // Move to next position
                this.startX = nextX;
                this.startY = nextY;
                return StepOutcome.CONTINUE; // Indicate continue
            } else {
                console.log(`Hit invalid position at (${nextX}, ${nextY}), handling edge`);
                // We hit an edge
                this.handleEdgeIntersection(this.startX, this.startY);
                
                // If we hit an edge, also start a new trunk
                return StepOutcome.RESET; // Indicate reset
            }
        } else if (this.currentPhase === 'medium') {
            console.log('Processing medium phase step');
            // Calculate next position
            const nextX = this.startX + this.DIRECTIONS[this.currentDirection][0];
            const nextY = this.startY + this.DIRECTIONS[this.currentDirection][1];

            // Check if we would hit another road or go out of bounds
            if (!this.isValidPosition(nextX, nextY) || 
                this.wouldHitExistingRoad(nextX, nextY) ||
                this.wouldCreateRoadBlock(nextX, nextY)) {
                return StepOutcome.RESET;
            }

            // Consider turning
            const turnChance = this.lastTurned ? 
                this.MEDIUM_BASE_TURN_CHANCE + this.MEDIUM_TURN_INCREASE : 
                this.MEDIUM_BASE_TURN_CHANCE;

            if (Math.random() < turnChance) {
                // Try to turn left or right
                const turnDirections = [
                    (this.currentDirection + 1) % 4, // Right
                    (this.currentDirection + 3) % 4  // Left
                ];

                // Check each turn direction
                for (const turnDir of turnDirections) {
                    const turnX = this.startX + this.DIRECTIONS[turnDir][0];
                    const turnY = this.startY + this.DIRECTIONS[turnDir][1];
                    
                    // Check if turning would create issues
                    if (this.isValidPosition(turnX, turnY) && 
                        !this.wouldHitExistingRoad(turnX, turnY) &&
                        !this.wouldCreateRoadBlock(turnX, turnY) &&
                        !this.isNearTrunkRoad(turnX, turnY)) {
                        
                        // Check the next tile after the turn
                        const afterTurnX = turnX + this.DIRECTIONS[turnDir][0];
                        const afterTurnY = turnY + this.DIRECTIONS[turnDir][1];
                        
                        if (this.isValidPosition(afterTurnX, afterTurnY) && 
                            !this.wouldHitExistingRoad(afterTurnX, afterTurnY) &&
                            !this.wouldCreateRoadBlock(afterTurnX, afterTurnY) &&
                            !this.isNearTrunkRoad(afterTurnX, afterTurnY)) {
                            
                            this.currentDirection = turnDir;
                            this.lastTurned = true;
                            break;
                        }
                    }
                }
            } else {
                this.lastTurned = false;
            }

            // Place current road
            this.placeRoad(this.startX, this.startY, 'medium');
            
            // Move to next position
            this.startX = nextX;
            this.startY = nextY;
            return StepOutcome.CONTINUE;
        } else if (this.currentPhase === 'minor') {
            const nextX = this.startX + this.DIRECTIONS[this.currentDirection][0];
            const nextY = this.startY + this.DIRECTIONS[this.currentDirection][1];

            // Stop if we've reached max length
            if (this.currentLength >= this.MINOR_MAX_LENGTH) {
                return StepOutcome.RESET;
            }

            if (!this.isValidPosition(nextX, nextY) || 
                this.wouldHitExistingRoad(nextX, nextY) ||
                this.wouldCreateRoadBlock(nextX, nextY)) {
                return StepOutcome.RESET;
            }

            // Place current road
            this.placeRoad(this.startX, this.startY, 'minor');
            this.currentLength++;
            
            // Check if we should continue
            if (this.currentLength >= 2) {  // After minimum length of 2
                if (Math.random() > this.MINOR_CONTINUE_CHANCE) {
                    return StepOutcome.RESET;
                }
            }
            
            this.startX = nextX;
            this.startY = nextY;
            return StepOutcome.CONTINUE;
        }

        return StepOutcome.DONE;
    }

    generate(): ChunkMetadata[][] {
        // First generate trunk roads
        this.currentPhase = 'trunk';
        this.reset();
        
        let consecutiveResets = 0;
        const MAX_CONSECUTIVE_RESETS = 10;
        
        // Generate trunk roads
        while (true) {
            const outcome = this.step();
            if (outcome === StepOutcome.DONE) {
                console.log('Trunk phase complete, transitioning to medium phase');
                break;
            } else if (outcome === StepOutcome.RESET) {
                consecutiveResets++;
                if (consecutiveResets >= MAX_CONSECUTIVE_RESETS) {
                    console.log('Too many consecutive resets, ending trunk phase');
                    break;
                }
                if (!this.startNewTrunk()) {
                    console.log('Could not find valid trunk point, ending trunk phase');
                    break;
                }
            } else {
                consecutiveResets = 0;
            }
        }

        // Then generate medium roads
        this.currentPhase = 'medium';
        consecutiveResets = 0;
        
        while (true) {
            const outcome = this.step();
            if (outcome === StepOutcome.DONE) {
                console.log('Medium phase complete, transitioning to minor phase');
                break;
            } else if (outcome === StepOutcome.RESET) {
                consecutiveResets++;
                if (consecutiveResets >= MAX_CONSECUTIVE_RESETS) {
                    console.log('Too many consecutive resets, ending medium phase');
                    break;
                }
                if (!this.startNewMedium()) {
                    console.log('Could not find valid medium point, ending medium phase');
                    break;
                }
            } else {
                consecutiveResets = 0;
            }
        }

        // Then generate minor roads
        this.currentPhase = 'minor';
        consecutiveResets = 0;
        
        while (true) {
            const outcome = this.step();
            if (outcome === StepOutcome.DONE) {
                break;
            } else if (outcome === StepOutcome.RESET) {
                consecutiveResets++;
                if (consecutiveResets >= MAX_CONSECUTIVE_RESETS) {
                    console.log('Too many consecutive resets, ending minor phase');
                    break;
                }
                if (!this.startNewMinor()) {
                    console.log('Could not find valid minor point, ending minor phase');
                    break;
                }
            } else {
                consecutiveResets = 0;
            }
        }

        // After all phases are complete, process all road connections
        this.processAllRoadConnections();

        this.dumpLayout();
        this.dumpLayoutByType();
        return this.layout;
    }

    private processAllRoadConnections(): void {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.layout[y][x].type === 'road') {
                    this.processRoadConnections(x, y);
                }
            }
        }
    }

    getCurrentLayout(): ChunkMetadata[][] {
        return this.layout;
    }

    // Add this helper method to check if a position is near a trunk road
    private isNearTrunkRoad(x: number, y: number): boolean {
        for (let dy = -this.MIN_DISTANCE_FROM_TRUNK; dy <= this.MIN_DISTANCE_FROM_TRUNK; dy++) {
            for (let dx = -this.MIN_DISTANCE_FROM_TRUNK; dx <= this.MIN_DISTANCE_FROM_TRUNK; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                if (this.isValidPosition(checkX, checkY) && 
                    this.layout[checkY][checkX].type === 'road' &&
                    this.layout[checkY][checkX].roadInfo?.weight === 'trunk') {
                    return true;
                }
            }
        }
        return false;
    }

    // Add this method to visualize the layout
    private dumpLayout(): void {
        console.log('\nFinal Layout:');
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                const roadInfo = cell.roadInfo;
                if (cell.type === 'road') {
                    row += roadInfo?.weight === 'trunk' ? 'T' : 
                           roadInfo?.weight === 'medium' ? 'M' : 'm';
                } else {
                    row += '.';
                }
            }
            console.log(row);
        }
        console.log('\nT = Trunk Road, M = Medium Road, m = Minor Road, . = Building\n');
    }

    private dumpLayoutByType(): void {
        console.log('\nLayout by Road Type:');
        for (let y = 0; y < this.height; y++) {
            let row = '';
            for (let x = 0; x < this.width; x++) {
                const cell = this.layout[y][x];
                const roadInfo = cell.roadInfo;

                const roadType = roadInfo?.type;
                if (cell.type === 'road') {
                    row += roadType === 'straight' ? 'S' : 
                           roadType === 'turn' ? 'T' : 
                           roadType === 'intersection' ? 'X' : 
                           roadType === 'deadend' ? 'D' : '?';
                } else {
                    row += '.';
                }
            }
            console.log(row);
        }
        console.log('\nS = Straight, C = Corner, T = T-intersection, X = Intersection, . = Building\n');
    }
} 