import { Engine } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Display } from '../display/display';
import { Renderer } from '../render/renderer';
import { DisplayOptions } from '../display/types';

export abstract class Game {
    protected engine!: Engine;
    protected input: InputManager;
    protected world!: World;
    protected player!: Entity;
    protected display: Display;
    protected renderer!: Renderer;
    private updateInterval: number | null = null;
    protected readonly targetFrameTime: number = 1000 / 15; // 15 FPS

    constructor(displayConfig: DisplayOptions) {
        this.display = new Display(displayConfig);
    
        // Set black background
        // this.display.setBackground(
        //     ' ',           // Empty character
        //     '#00000000', // Transparent foreground
        //     '#000000FF'     // Black background
        // );
        
        // Initialize input handling
        this.input = new InputManager();
        this.input.registerCallback(this.handleInput.bind(this), 0);


        // Initialize the world (which will set engine and player)
        this.initializeWorld();

        // Create renderer
        this.renderer = this.createRenderer();
    }

    protected abstract createRenderer(): Renderer;
    protected abstract initializeWorld(): void;
    protected abstract handleInput(type: string, action: string, params: string[]): void;

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

    public getWorld(): World {
        return this.world;
    }

    public getEngine(): Engine {
        return this.engine;
    }
} 