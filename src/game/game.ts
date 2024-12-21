import { Engine, EngineConfig } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Display } from '../display/display';
import { Renderer } from '../render/renderer';
import { SymbolComponent } from '../entity/component';

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
    private display: Display;
    private renderer: Renderer;
    private updateInterval: number | null = null;
    private readonly targetFrameTime: number = 1000 / 15; // 15 FPS

    constructor(display: Display) {
        const width = display.getWorldWidth();
        const height = display.getWorldHeight();
        
        this.display = display;

        // Create world and player first
        this.world = new World(width, height);

        this.renderer = new Renderer(this.world, this.display);


        this.player = new Entity({ x: Math.floor(width/2), y: Math.floor(height/2) });
        this.player.setComponent(new SymbolComponent(
            '@',            // Traditional roguelike player symbol
            '#FFD700',      // Gold color for player
            'transparent',  // Transparent background
            5              // Higher z-index to stay above most entities
        ));
        this.world.addEntity(this.player);
        
        // Initialize engine with our world
        const engineConfig: EngineConfig = {
            mode: 'realtime',
            worldWidth: width,
            worldHeight: height,
            player: this.player,
            world: this.world
        };
        this.engine = new Engine(engineConfig);

        // Initialize renderer with our world

        // Set up input handling
        this.input = new InputManager();
        this.input.loadConfig(DEFAULT_INPUT_CONFIG);
        this.input.setMode('game');
        
        // Register input callback
        this.input.registerCallback(this.handleInput.bind(this), 0);
    }

    public start(): void {
        this.updateInterval = window.setInterval(() => {
            const now = performance.now();
            this.engine.update(now);
        }, this.targetFrameTime);
    }

    public stop(): void {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    private handleInput(type: string, action: string, params: string[]): void {
        if (type === 'up') {
            return;
        }

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

    public getWorld(): World {
        return this.world;
    }
} 