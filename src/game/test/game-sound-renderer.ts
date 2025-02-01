import { Entity } from '../../entity/entity';
import { Component } from '../../entity/component';
import { Direction, Point } from '../../types';
import { BaseSoundRenderer } from '../../sound/base-sound-renderer';
import { World } from '../../world/world';
import { logger } from '../../util/logger';
import { CooldownComponent } from './components/cooldown.component';
import { InertiaComponent } from './components/inertia.component';
import { BufferedMoveComponent } from './components/buffered-move.component';
import { TurboComponent } from './components/turbo.component';

export class GameSoundRenderer extends BaseSoundRenderer {
    constructor(world: World, audioContext: AudioContext) {
        super(world, audioContext);
        
        // Load initial sounds
        this.loadSounds([
            {
                id: 'turbo',
                url: '/assets/sound/turbo.mp3',
                options: {
                    category: 'sfx'
                }
            },
            {
                id: 'tick',
                url: '/assets/sound/beat-Tone3E.wav',
                options: {
                    category: 'sfx'
                }
            }
        ]);
    }

    public handleEntityAdded(entity: Entity, id: string): void {
        // No-op
    }

    public handleEntityModified(entity: Entity, componentType: string): void {
        // No-op
    }

    public handleComponentModified(entity: Entity, componentType: string): void {
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
                            this.playSound('turbo', { volume: 0.3 });
                        }
                    }
                    const inertia = entity.getComponent('inertia') as InertiaComponent;
                    const bufferedMove = entity.getComponent('bufferedMove') as BufferedMoveComponent;

                    if((inertia && inertia.magnitude > 0) || (bufferedMove && bufferedMove.direction != Direction.None)) {
                        this.playSound('tick', { volume: 0.1 });
                    }
                }
            }
        }
    }

    public handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        // No-op
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

    protected stopSound(soundId: string): void {
        // TODO: Implement when we need to stop sounds
    }

    public handleComponentAdded(entity: Entity, componentType: string): void {
        // if(entity.hasComponent('player') && componentType == 'turbo') {
        //     this.playSound('turbo', { volume: 1.0 });
        // }
    }
} 