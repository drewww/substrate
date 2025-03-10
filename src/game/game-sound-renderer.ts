import { logger } from '../util/logger';
import { CooldownComponent } from './components/cooldown.component';
import { InertiaComponent } from './components/inertia.component';
import { BufferedMoveComponent } from './components/buffered-move.component';
import { TurboComponent } from './components/turbo.component';
import { World } from '../world/world';
import { BaseSoundRenderer } from '../sound/base-sound-renderer';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Direction } from '../types';
import { Component } from '../entity/component';


import turboSound from '../assets/sound/turbo.mp3?url';
import tickSound from '../assets/sound/beat-Tone3E.wav?url';

import crashSound from '../assets/sound/crash.wav?url';
import lowEngineSound from '../assets/sound/low-engine.wav?url';
import midEngineSound from '../assets/sound/mid-engine.wav?url';
import highEngineSound from '../assets/sound/high-engine.wav?url';
import turboEngineSound from '../assets/sound/turbo-engine.wav?url';
import objectiveSound from '../assets/sound/objective.wav?url';
import lockedSound from '../assets/sound/locked.wav?url';
import unlockedSound from '../assets/sound/unlocked.wav?url';
import { LockedComponent } from './components/locked.component';
import laserSound from '../assets/sound/laser.wav?url';

enum EngineState {
    Off = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Turbo = 4
}

export class RuntimeSoundRenderer extends BaseSoundRenderer {
    private isLocked: boolean = false;  // Add state 
    private isStunned: boolean = false;
    private currentEngineState: EngineState = EngineState.Off;

    constructor(world: World, audioContext: AudioContext) {
        super(world, audioContext);
        
        // Load initial sounds
        this.loadSounds([
            {
                id: 'laser',
                url: laserSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'turbo',
                url: turboSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'tick',
                url: tickSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'crashed',
                url: crashSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'low-engine',
                url: lowEngineSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'mid-engine',
                url: midEngineSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'high-engine',
                url: highEngineSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'turbo-engine',
                url: turboEngineSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'objective',
                url: objectiveSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'locked',
                url: lockedSound,
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'unlocked',
                url: unlockedSound,
                options: {
                    category: 'sfx'
                }
            }
        ]);
    }

    public stopAllSounds(): void {
        this.stopSound('low-engine');
        this.stopSound('mid-engine');
        this.stopSound('high-engine');
        this.stopSound('turbo-engine');
        super.stopAllSounds();

        setTimeout(() => {
            this.stopSound('low-engine');
            this.stopSound('mid-engine');
            this.stopSound('high-engine');
            this.stopSound('turbo-engine');
        }, 100);
    }

    public handleEntityAdded(entity: Entity): void {
        // No-op
    }

    public handleEntityModified(entity: Entity, componentType: string): void {
        // No-op
    }

    public handleComponentModified(entity: Entity, componentType: string): void {
        // if (componentType in ['stun', 'locked', 'cooldown']) {
        //     logger.warn('SOUND component modified', componentType);
        // }
        
        const cooldown =  entity.getComponent('cooldown') as CooldownComponent;
        const stunCooldown = cooldown?.getCooldown('stun');

        if (stunCooldown && !this.isStunned) {
            logger.warn('playing stunned sound');
            this.stopSound('low-engine');
            this.stopSound('mid-engine');
            this.stopSound('high-engine');
            this.stopSound('turbo-engine');
            this.playSound('crashed', { volume: 0.2 });
            this.isStunned = true;
        }

        if(entity.hasComponent('player') && componentType == "locked") {
            const locked = entity.getComponent('locked') as LockedComponent;
            if(locked && !this.isLocked) {
                this.playSound('locked', { volume: 0.05 });
                this.isLocked = true;
            }
        }

        if(entity.hasComponent('player') && componentType == 'cooldown') {
            const cooldowns = entity.getComponent('cooldown') as CooldownComponent;
            if(cooldowns) {
                const move = cooldowns.getCooldown('move');
                if(move && move.ready) {
                    // There's a bug here -- component modified is called more than once per cooldown in the turn, beacuse multiple
                    // places edit it. We need to debounce somehow but I'm not sure a good way to do it.
                    if(entity.hasComponent('turbo')) {
                        const turbo = entity.getComponent('turbo') as TurboComponent;

                        if(turbo.turnsSinceEngaged==0) {
                            this.playSound('turbo', { volume: 0.1 });
                        }
                    }
                    const inertia = entity.getComponent('inertia') as InertiaComponent;
                    const bufferedMove = entity.getComponent('bufferedMove') as BufferedMoveComponent;

                    if((inertia && inertia.magnitude > 0) || (bufferedMove && bufferedMove.direction != Direction.None)) {
                        // this.playSound('tick', { volume: 0.1 });
                    }
                }
            }
        }

        if (entity.hasComponent('player') && componentType === 'inertia') {
            const inertia = entity.getComponent('inertia') as InertiaComponent;
            const hasTurbo = entity.hasComponent('turbo');
            
            let newState = EngineState.Off;
            
            if (inertia.magnitude > 0) {
                if (hasTurbo) {
                    newState = EngineState.Turbo;
                } else if (inertia.magnitude >= 2 && inertia.magnitude < 4) {
                    newState = EngineState.Medium;
                } else if (inertia.magnitude >= 4) {
                    newState = EngineState.High;
                } else {
                    newState = EngineState.Low;
                }
            }

            if (newState !== this.currentEngineState) {
                logger.warn('Engine state changed:', EngineState[this.currentEngineState], '->', EngineState[newState]);
                
                // Stop current engine sound if any
                switch (this.currentEngineState) {
                    case EngineState.Low:
                        this.stopSound('low-engine');
                        break;
                    case EngineState.Medium:
                        this.stopSound('mid-engine');
                        break;
                    case EngineState.High:
                        this.stopSound('high-engine');
                        break;
                    case EngineState.Turbo:
                        this.stopSound('turbo-engine');
                        break;
                }

                // Start new engine sound
                // switch (newState) {
                //     case EngineState.Low:
                //         this.playSound('low-engine', { volume: 0.3, loop: true });
                //         break;
                //     case EngineState.Medium:
                //         this.playSound('mid-engine', { volume: 0.3, loop: true });
                //         break;
                //     case EngineState.Turbo:
                //         this.playSound('turbo-engine', { volume: 0.3, loop: true });
                //         break;
                //     case EngineState.High:
                //         this.playSound('high-engine', { volume: 0.3, loop: true });
                //         break;
                // }

                this.currentEngineState = newState;
            }
        }
    }

    public handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if(entity.hasComponent('player') && componentType === 'locked') {
            this.isLocked = false;  // Reset the lock state when component is removed
            this.playSound('unlocked', { volume: 0.05 });
        }

        if(entity.hasComponent('player') && componentType === 'stun') {
            this.isStunned = false;  // Reset the stun state when component is removed
        }
    }

    public handleEntityRemoved(entity: Entity): void {
        // No-op
    }

    public handleEntityMoved(entity: Entity, from: Point, to: Point): boolean {
        return false;
    }

    public handleUpdate(timestamp: number): void {
        // No-op
    }

    protected updateCategoryVolumes(category: string): void {
        // For each active sound in this category, update its volume
        for (const [id, state] of this.activeSounds) {
            const volume = this.getEffectiveVolume(state.volume, category);
            this.updateSoundVolume(id, volume);
        }
    }

    protected updateSoundVolume(soundId: string, volume: number): void {
        // TODO: Implement when we need dynamic volume control
    }

    public handleComponentAdded(entity: Entity, componentType: string): void {
        // if(entity.hasComponent('player') && componentType == 'turbo') {
        //     this.playSound('turbo', { volume: 1.0 });
        // }
    }

    public async loadSound(definition: SoundDefinition): Promise<void> {
        try {
            logger.info(`Loading sound: ${definition.id} from ${definition.url}`);
            const response = await fetch(definition.url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundBuffers.set(definition.id, audioBuffer);
            logger.info(`Successfully loaded sound: ${definition.id}`);
        } catch (error) {
            console.error(`Failed to load sound ${definition.id}:`, error);
        }
    }
} 