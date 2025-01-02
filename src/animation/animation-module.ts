import { EasingFunction } from '../display/types';
import { logger } from '../util/logger';

// Base interface for all animation configurations
export interface AnimationConfig {
    startTime?: number;
    running: boolean;
}

// Internal type that ensures startTime is set
type RuntimeAnimationConfig = Omit<AnimationConfig, 'startTime'> & {
    startTime: number;
}

export interface AnimationProperty<T = any> {
    duration: number;
    reverse?: boolean;
    loop?: boolean;
    offset?: number;
    easing?: EasingFunction;
    next?: AnimationProperty<T>;  // Allow chaining to next animation
    start?: T;
    end?: T;
    symbols?: T[];  // For symbol animations
}

interface AnimationMetrics {
    activeCount: number;
    totalCount: number;
}

export abstract class AnimationModule<TValue, TConfig extends AnimationConfig> {
    protected animations = new Map<string, TConfig & RuntimeAnimationConfig>();

    constructor(
        protected onUpdate: (id: string, value: TValue) => void
    ) {}

    public get size(): number {
        return this.getMetrics().activeCount;
    }

    public getMetrics(): AnimationMetrics {
        const total = this.animations.size;
        const active = Array.from(this.animations.values())
            .filter(animation => animation.running)
            .length;

        return {
            activeCount: active,
            totalCount: total
        };
    }

    public add(id: string, config: Omit<TConfig, 'running'>): void {
        this.animations.set(id, {
            ...config,
            startTime: config.startTime ?? performance.now(),
            running: true
        } as TConfig & RuntimeAnimationConfig);
    }

    public update(timestamp: number): void {        
        for (const [id, animation] of this.animations) {
            if (!animation.running) continue;

            // Handle each property's animation separately
            for (const [key, prop] of Object.entries(animation)) {
                if (prop && typeof prop === 'object' && 'duration' in prop) {
                    const elapsed = (timestamp - animation.startTime) / 1000;
                    let progress = (elapsed / prop.duration) + (prop.offset ?? 0);

                    if (prop.loop) {
                        if (prop.reverse) {
                            progress = progress % 2;
                            if (progress > 1) progress = 2 - progress;
                        } else {
                            progress = progress % 1;
                        }
                    } else {
                        progress = Math.min(progress, 1);
                        
                        // Handle chaining when non-looping animation completes
                        if (progress === 1 && 'next' in prop && prop.next) {
                            // Create new animation that preserves the chain
                            const nextProp = {
                                ...prop.next,
                                // Preserve the next chain without checking loop
                                next: prop.next.next
                            };
                            
                            // Type-safe way to update the animation property
                            const newAnimation = { ...animation };
                            (newAnimation as any)[key] = nextProp;
                            newAnimation.startTime = timestamp;  // Reset start time on the new animation
                            this.animations.set(id, newAnimation as TConfig & RuntimeAnimationConfig);
                            continue;
                        }
                    }

                    const easedProgress = prop.easing ? 
                        prop.easing(progress) : progress;

                    this.updateValue(id, animation, easedProgress);
                }
            }
        }
    }

    public get(id: string): TConfig | undefined {
        return this.animations.get(id);
    }

    public clear(id: string): void {
        this.animations.delete(id);
    }

    public clearAll(): void {
        this.animations.clear();
    }

    public stop(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            animation.running = false;
        }
    }

    protected abstract interpolateValue(config: TConfig, progress: number): TValue;

    protected updateValue(id: string, config: TConfig, progress: number): void {
        const value = this.interpolateValue(config, progress);
        this.onUpdate(id, value);
    }
} 