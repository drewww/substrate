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
    duration: number | number[];  // Can now be a single number or array of numbers
    reverse?: boolean;
    loop?: boolean;
    chainLoop?: boolean;
    progressOffset?: number;
    easing?: EasingFunction;
    start?: T;
    end?: T;
    symbols?: T[];
    next?: AnimationProperty<T>;
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
                if (key === 'startTime' || key === 'running') continue;
                if (!prop || typeof prop !== 'object') continue;


                // logger.info(`${id} ${key} ${JSON.stringify(prop)}`);

                // logger.info(`current duration: ${prop.lastDuration}`);

                const duration = prop.lastDuration ?? this.getNextDuration(prop);

                prop.lastDuration = duration;

                let progress = (timestamp - animation.startTime) / (duration * 1000);


                
                // If we have a chain, individual loop properties are ignored
                const isChain = Boolean(prop.chainLoop || prop.next);

                if (!isChain && prop.loop) {
                    if (prop.reverse) {
                        progress = progress % 2;
                        if (progress > 1) progress = 2 - progress;
                    } else {
                        progress = progress % 1;
                    }

                    // Reset duration when a loop completes
                    if (progress < (prop as any).lastProgress) {
                        delete (prop as any).lastDuration;
                    }
                    (prop as any).lastProgress = progress;
                } else {

                    // For non-chain animations that complete, cap at 1 and stop
                    progress = Math.min(progress, 1);

                    if (isChain && progress === 1) {
                        // Create next animation step with chainLoop preserved
                        const nextProp = {
                            ...prop.next,
                            chainLoop: prop.chainLoop,
                            next: prop.next?.next
                        };

                        // If we're at the end of the chain and chainLoop is true,
                        // restart the chain from the beginning
                        if (!nextProp.next && prop.chainLoop) {
                            logger.info(`Restarting chain loop for ${id}`);
                            const originalAnimation = this.animations.get(id);
                            if (originalAnimation) {
                                const firstProp = (originalAnimation as any)[key];
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

                    if(progress === 1) {
                        animation.running = false;
                        this.animations.delete(id);
                        continue;
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

    protected getNextDuration(prop: AnimationProperty): number {
        let duration = 1;

        if (Array.isArray(prop.duration)) {
            duration = prop.duration[Math.floor(Math.random() * prop.duration.length)];
        } else {
            duration = prop.duration;
        }

        // logger.info(`Selected new duration: ${duration}`);
        return duration;
    }
} 