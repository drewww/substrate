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
    loop?: boolean;      // Loop this specific animation step
    chainLoop?: boolean; // Loop the entire chain sequence
    progressOffset?: number;
    
    easing?: EasingFunction;

    start?: T;
    end?: T;

    symbols?: T[];

    next?: AnimationProperty<T>;  // Next animation in the chain
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

        // logger.info(`Added animation ${id} with config: ${JSON.stringify(config)}`);
    }

    public update(timestamp: number): void {        
        for (const [id, animation] of this.animations) {
            if (!animation.running) continue;

            for (const [key, prop] of Object.entries(animation)) {
                if (prop && typeof prop === 'object' && 'duration' in prop) {
                    const elapsed = (timestamp - animation.startTime) / 1000;
                    let progress = (elapsed / prop.duration) + (prop.offset ?? 0);

                    // If we have a chain, individual loop properties are ignored
                    const isChain = Boolean(prop.chainLoop || prop.next);

                    if (!isChain && prop.loop) {
                        if (prop.reverse) {
                            progress = progress % 2;
                            if (progress > 1) progress = 2 - progress;
                        } else {
                            progress = progress % 1;
                        }
                    } else {
                        progress = Math.min(progress, 1);

                        // Handle chaining when animation completes
                        if (progress === 1 && isChain) {
                            
                            // Create next animation step with chainLoop preserved
                            const nextProp = {
                                ...prop.next,
                                // Preserve chainLoop from the original animation
                                chainLoop: prop.chainLoop,
                                // Preserve next chain
                                next: prop.next?.next
                            };
                            
                            // If we're at the end of the chain and chainLoop is true,
                            // restart the chain from the beginning
                            if (!nextProp.next && prop.chainLoop) {
                                // Get the first animation in the chain
                                const originalAnimation = this.animations.get(id);
                                if (originalAnimation) {
                                    const firstProp = (originalAnimation as any)[key];
                                    // Create a deep copy of the first animation
                                    nextProp.next = {
                                        ...firstProp,
                                        next: firstProp.next,
                                        chainLoop: prop.chainLoop
                                    };
                                }
                            }

                            const newAnimation = { ...animation };
                            (newAnimation as any)[key] = nextProp;
                            newAnimation.startTime = timestamp;
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