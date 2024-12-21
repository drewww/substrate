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
    protected renderer: Renderer;
    private updateInterval: number | null = null;
    protected readonly targetFrameTime: number = 1000 / 15; // 15 FPS

    constructor(display: Display) {
        const width = display.getWorldWidth();
        const height = display.getWorldHeight();
        
        this.display = display;
        this.world = new World(width, height);
        this.renderer = new Renderer(this.world, this.display);
        
        // Initialize input handling
        this.input = new InputManager();
        this.input.registerCallback(this.handleInput.bind(this), 0);

        // Initialize the world (which will set engine and player)
        this.initializeWorld();
    }

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