import { Engine } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Display } from '../display/display';
import { BaseRenderer } from '../render/base-renderer';
import { DisplayOptions } from '../display/types';
import { GameSoundRenderer } from './test/game-sound-renderer';

export abstract class Game {
    protected engine!: Engine;
    protected input: InputManager;
    protected world!: World;
    protected player!: Entity;
    protected display: Display;
    protected renderer!: BaseRenderer;
    protected updateInterval: number | null = null;
    protected readonly targetFrameTime: number = 1000 / 15; // 15 FPS
    protected soundRenderer!: GameSoundRenderer;
    protected audioContext: AudioContext;

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

        // Create audio context but don't initialize sound renderer yet
        this.audioContext = new AudioContext();
        
        // Add click handler to start audio
        document.addEventListener('click', () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                });
            }
        }, { once: true }); // Only need to do this once

        // Initialize the world (which will set engine and player)
        this.initializeWorld();

        // Create renderer
        this.renderer = this.createRenderer();

        // Create sound renderer
        this.soundRenderer = this.createSoundRenderer();
    }

    protected abstract createRenderer(): BaseRenderer;
    protected abstract createSoundRenderer(): GameSoundRenderer;
    protected abstract initializeWorld(): void;
    protected abstract handleInput(type: string, action: string, params: string[]): void;

    protected initialize(): void {
        // Create renderer
        this.renderer = this.createRenderer();

        // Initialize sound renderer after world is created
        this.soundRenderer = new GameSoundRenderer(this.world, this.audioContext);
    }

    public start(): void {
        // Start the engine
        this.engine.start();

        // Start the render loop
        // const animate = () => {
        //     // Remove the engine.update call since the EngineLoop handles that now
        //     this.display.render();
        //     requestAnimationFrame(animate);
        // };
        // requestAnimationFrame(animate);
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

    update(timestamp: number): void {
        // ... existing update code ...
        this.soundRenderer.update(timestamp);
    }
} 