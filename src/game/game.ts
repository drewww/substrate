import { Engine } from '../engine/engine';
import { InputManager } from '../input/input';
import { World } from '../world/world';
import { Entity } from '../entity/entity';
import { Display } from '../display/display';
import { BaseRenderer } from '../render/base-renderer';
import { DisplayOptions } from '../display/types';
import { GameSoundRenderer } from './test/game-sound-renderer';

export abstract class Game {
    protected engine: Engine | null = null;
    protected input: InputManager;
    protected world: World | null = null;
    protected player: Entity | null = null;
    protected display: Display | null = null;
    protected renderer: BaseRenderer | null = null;
    protected updateInterval: number | null = null;
    protected readonly targetFrameTime: number = 1000 / 15; // 15 FPS
    protected soundRenderer: GameSoundRenderer | null = null;
    protected audioContext: AudioContext;
    private prepared = false;

    constructor() {
        // Only do truly synchronous initialization here
        this.input = new InputManager();
        this.input.registerCallback(this.handleInput.bind(this), 0);

        // Create audio context
        this.audioContext = new AudioContext();
        
        // Add click handler to start audio
        document.addEventListener('click', () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                });
            }
        }, { once: true });
    }

    protected abstract createRenderer(): BaseRenderer;
    protected abstract createSoundRenderer(): GameSoundRenderer;
    protected abstract setup(): Promise<void>;
    protected abstract handleInput(type: string, action: string, params: string[]): void;
    protected abstract createDisplay(): Display;

    public async prepare(): Promise<void> {
        if (this.prepared) return;

        // Initialize the world (which will set engine and player)
        await this.setup();

        if (!this.world || !this.player) {
            throw new Error('World initialization failed');
        }

        // Create display now that we know world dimensions
        this.display = this.createDisplay();
        
        // Create renderer (which needs both world and display)
        this.renderer = this.createRenderer();

        // Create sound renderer
        this.soundRenderer = this.createSoundRenderer();

        this.prepared = true;
    }

    protected isReady(): boolean {
        return this.prepared && 
               !!this.world && 
               !!this.player && 
               !!this.renderer && 
               !!this.soundRenderer;
    }

    public start(): void {
        if (!this.isReady()) {
            throw new Error('Game must be prepared before starting');
        }

        // Start the engine
        this.engine?.start();
    }

    public stop(): void {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    public getWorld(): World {
        if (!this.world) throw new Error('World not initialized');
        return this.world;
    }

    public getEngine(): Engine {
        if (!this.engine) throw new Error('Engine not initialized');
        return this.engine;
    }

    update(timestamp: number): void {
        if (!this.soundRenderer) throw new Error('Sound renderer not initialized');
        this.soundRenderer.update(timestamp);
    }
} 