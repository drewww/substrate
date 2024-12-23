import { Engine } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Display } from '../display/display';
import { Renderer } from '../render/renderer';

export abstract class Game {
    protected engine!: Engine;
    protected input: InputManager;
    protected world: World;
    protected player!: Entity;
    protected display: Display;
    protected renderer!: Renderer;
    private updateInterval: number | null = null;
    protected readonly targetFrameTime: number = 1000 / 15; // 15 FPS

    constructor(canvasId: string) {
        const width = 120;
        const height = 120;

        this.display = new Display({
            elementId: canvasId,
            cellWidth: 20,
            cellHeight: 20,
            worldWidth: width,
            worldHeight: height,
            viewportWidth: width/4,
            viewportHeight: height/4
        });
    
        // Set black background
        this.display.setBackground(
            ' ',           // Empty character
            'transparent', // Transparent foreground
            '#000000FF'     // Black background
        );

        this.world = new World(width, height);
        
        // Initialize input handling
        this.input = new InputManager();
        this.input.registerCallback(this.handleInput.bind(this), 0);

        // Create renderer
        this.renderer = this.createRenderer();

        // Initialize the world (which will set engine and player)
        this.initializeWorld();
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
} 