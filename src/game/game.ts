import { Engine, EngineConfig } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Point } from '../types';

const DEFAULT_INPUT_CONFIG = `
mode: game
==========
map: default
---
w move up
s move down
a move left
d move right
`;

export class Game {
    private engine: Engine;
    private input: InputManager;
    private world: World;
    private player: Entity;

    constructor(width: number, height: number) {
        // Create world and player
        this.world = new World(width, height);
        this.player = new Entity({ x: Math.floor(width/2), y: Math.floor(height/2) });
        
        // Initialize engine
        const engineConfig: EngineConfig = {
            mode: 'realtime',
            worldWidth: width,
            worldHeight: height,
            player: this.player
        };
        this.engine = new Engine(engineConfig);

        // Set up input handling
        this.input = new InputManager();
        this.input.loadConfig(DEFAULT_INPUT_CONFIG);
        this.input.setMode('game');
        
        // Register input callback
        this.input.registerCallback(this.handleInput.bind(this), 0);
    }

    private handleInput(type: string, action: string, params: string[]): void {
        if (action === 'move') {
            const pos = this.player.getPosition();
            let newPos: Point = { ...pos };

            switch(params[0]) {
                case 'up':    newPos.y--; break;
                case 'down':  newPos.y++; break;
                case 'left':  newPos.x--; break;
                case 'right': newPos.x++; break;
            }

            this.engine.handleAction({
                type: 'move',
                position: newPos
            });
        }
    }

    public update(timestamp: number): void {
        this.engine.update(timestamp);
    }

    public getWorld(): World {
        return this.world;
    }
} 