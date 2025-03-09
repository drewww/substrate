import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { World } from '../world/world';
import { Point } from '../types';
import { logger } from '../util/logger';
import { Renderer } from '../render/renderer';

interface SoundDefinition {
    id: string;
    url: string;
    options?: {
        category?: 'sfx' | 'music' | 'ui' | 'ambient';
        volume?: number;
        loop?: boolean;
        spatial?: boolean;
    };
}

interface SoundState {
    id: string;
    loop: boolean;
    volume: number;
    position?: Point;
    source?: AudioBufferSourceNode;
    gainNode?: GainNode;
}

export abstract class BaseSoundRenderer implements Renderer {
    // Track loaded sound buffers
    protected soundBuffers: Map<string, AudioBuffer> = new Map();
    
    // Track sound categories for volume control
    protected categoryVolumes: Map<string, number> = new Map([
        ['sfx', 1.0],
        ['music', 0.7],
        ['ui', 1.0],
        ['ambient', 0.5]
    ]);

    // Track currently playing sounds
    protected activeSounds: Map<string, SoundState> = new Map();
    
    // Track looping sounds by entity
    protected entityLoopingSounds: Map<string, Set<string>> = new Map();
    
    constructor(
        protected world: World,
        protected audioContext: AudioContext
    ) {
        // Subscribe to world events
        this.world.on('entityAdded', ({ entity }) => this.handleEntityAdded(entity));
        this.world.on('entityRemoved', ({ entity }) => this.handleEntityRemoved(entity));
        this.world.on('entityMoved', ({ entity, from, to }) => this.handleEntityMoved(entity, from, to));
        this.world.on('entityModified', ({ entity, componentType }) => this.handleEntityModified(entity, componentType));
        this.world.on('componentModified', ({ entity, componentType }) => this.handleComponentModified(entity, componentType));
        this.world.on('componentRemoved', ({ entity, componentType, component }) => this.handleComponentRemoved(entity, componentType, component));
        this.world.on('componentAdded', ({ entity, componentType }) => this.handleComponentAdded(entity, componentType));

        // Initialize existing entities
        if(this.world.getAllEntities().length > 0) {
            for(const entity of this.world.getAllEntities()) {
                this.handleEntityAdded(entity);
            }
        }
    }

    /**
     * Update sound states (called each frame)
     */
    public update(timestamp: number): void {
        // TODO: update spatial audio positions

        // Let subclasses handle their specific updates
        this.handleUpdate(timestamp);
    }

    /**
     * Clean up sounds when entity is removed
     */
    protected onEntityRemoved(entity: Entity): void {
        const sounds = this.entityLoopingSounds.get(entity.getId());
        if (sounds) {
            sounds.forEach(soundId => {
                // Stop the sound (to be implemented by concrete class)
                this.stopSound(soundId);
                this.activeSounds.delete(soundId);
            });
            this.entityLoopingSounds.delete(entity.getId());
        }

        this.handleEntityRemoved(entity);
    }

    /**
     * Load a single sound
     */
    public async loadSound(definition: SoundDefinition): Promise<void> {
        try {
            const response = await fetch(definition.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(definition.id, audioBuffer);
        } catch (error) {
            console.error(`Failed to load sound ${definition.id}:`, error);
        }
    }

    /**
     * Load multiple sounds at once
     */
    public async loadSounds(definitions: SoundDefinition[]): Promise<void> {
        await Promise.all(definitions.map(def => this.loadSound(def)));
    }

    /**
     * Play a sound
     */
    public playSound(
        id: string, 
        options?: { 
            volume?: number; 
            loop?: boolean; 
            category?: string;
        }
    ): void {
        const buffer = this.soundBuffers.get(id);
        if (!buffer) {
            console.warn(`Sound ${id} not loaded`);
            return;
        }

        // Create source node
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        // Create gain node for volume control
        const gainNode = this.audioContext.createGain();
        const baseVolume = options?.volume ?? 1.0;
        gainNode.gain.value = this.getEffectiveVolume(baseVolume, options?.category);

        // Connect nodes
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        // Configure source
        source.loop = options?.loop ?? false;

        // Start playback
        source.start(0);

        // Store state for volume control
        const state: SoundState = {
            id,
            loop: source.loop,
            volume: baseVolume,
            source,
            gainNode
        };
        this.activeSounds.set(id, state);

        // Clean up when done
        source.onended = () => {
            source.disconnect();
            gainNode.disconnect();
            this.activeSounds.delete(id);
        };
    }

    /**
     * Set volume for a sound category
     */
    public setCategoryVolume(category: string, volume: number): void {
        this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
        // Update all playing sounds in this category
        this.updateCategoryVolumes(category);
    }

    /**
     * Check if a sound is loaded
     */
    public isSoundLoaded(id: string): boolean {
        return this.soundBuffers.has(id);
    }

    /**
     * Get the effective volume for a sound (considering category)
     */
    protected getEffectiveVolume(baseVolume: number, category?: string): number {
        const categoryVolume = category ? (this.categoryVolumes.get(category) ?? 1.0) : 1.0;
        return baseVolume * categoryVolume;
    }

    /**
     * Update volumes for all sounds in a category
     */
    protected abstract updateCategoryVolumes(category: string): void;

    /**
     * Update volume for a specific sound
     */
    protected abstract updateSoundVolume(soundId: string, volume: number): void;

    /**
     * Stop a specific sound
     */
    public stopSound(soundId: string): void {
        const sound = this.activeSounds.get(soundId);
        if (sound && sound.source) {
            sound.source.stop();
            sound.source.disconnect();
            if (sound.gainNode) {
                sound.gainNode.disconnect();
            }
            this.activeSounds.delete(soundId);
        }
    }

    /**
     * Stop all currently playing sounds
     */
    public stopAllSounds(): void {
        // Create a copy of the keys since we'll be modifying the map while iterating
        const soundIds = Array.from(this.activeSounds.keys());
        
        // Stop each sound
        for (const soundId of soundIds) {
            this.stopSound(soundId);
        }
        
        // Clear the maps
        this.activeSounds.clear();
        this.entityLoopingSounds.clear();
    }
    
    // Required Renderer interface methods
    public abstract handleEntityAdded(entity: Entity): void;
    public abstract handleEntityModified(entity: Entity, componentType: string): void;
    public abstract handleComponentModified(entity: Entity, componentType: string): void;
    public abstract handleComponentRemoved(entity: Entity, componentType: string, component: Component): void;
    public abstract handleComponentAdded(entity: Entity, componentType: string): void;
    public abstract handleEntityRemoved(entity: Entity): void;
    public abstract handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;
    public abstract handleUpdate(timestamp: number): void;
} 