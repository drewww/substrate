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
    startTime?: number;  // Add per-property start time
    current?: T;  // Add current value tracking
}

interface AnimationMetrics {
    activeCount: number;
    totalCount: number;
}

export abstract class AnimationModule<TValue, TConfig extends AnimationConfig> {
    protected animations = new Map<string, TConfig & RuntimeAnimationConfig>();
    private onCompleteCallbacks = new Map<string, () => void>();

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

    public add(id: string, config: Omit<TConfig, 'running'>, onComplete?: () => void): void {
        const existingAnimation = this.animations.get(id);
        
        this.animations.set(id, {
            ...(existingAnimation ?? {}),
            ...config,
            startTime: config.startTime ?? performance.now(),
            running: true
        } as TConfig & RuntimeAnimationConfig);

        if (onComplete) {
            this.onCompleteCallbacks.set(id, onComplete);
        }

        // logger.info(`Added animation ${id} with config: ${JSON.stringify(config)}`);
    }

    public update(timestamp: number): void {
        const toDelete = new Set<string>();

        for (const [id, animation] of this.animations) {
            if (!animation.running) continue;

            let shouldComplete = true;
            let hasRunningAnimation = false;

            // logger.info(`Updating animation ${id} with properties: ${Object.keys(animation).filter(k => k !== 'startTime' && k !== 'running')}`);

            for (const [key, prop] of Object.entries(animation)) {
                if (key === 'startTime' || key === 'running') continue;
                if (!prop || typeof prop !== 'object') continue;

                // Use property-specific start time or animation start time
                const startTime = prop.startTime ?? animation.startTime;
                const duration = prop.lastDuration ?? this.getNextDuration(prop);
                prop.lastDuration = duration;
                let progress = (timestamp - startTime) / (duration * 1000);

                // logger.info(`  ${key}: progress=${progress.toFixed(2)}, duration=${duration}, has_next=${Boolean(prop.next)}`);

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
                    
                    // Mark as running if it's a looped animation
                    hasRunningAnimation = true;
                    shouldComplete = false;
                } else {
                    progress = Math.min(progress, 1);
                    
                    // Handle chaining when animation completes
                    if (progress >= 1 && prop.next) {
                        // logger.info(`  ${key}: transitioning to next animation`);
                        const nextProp = {
                            ...prop.next,
                            next: prop.next.next,
                            startTime: timestamp,  // Set property-specific start time
                            lastDuration: undefined,
                            chainLoop: prop.chainLoop  // Preserve chainLoop property
                        };

                        // If we're at the end of the chain and chainLoop is true,
                        // restart the chain from the beginning
                        if (!nextProp.next && prop.chainLoop) {
                            // Get the first animation in the chain
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
                        this.animations.set(id, newAnimation as TConfig & RuntimeAnimationConfig);
                        hasRunningAnimation = true;
                        shouldComplete = false;
                        continue;
                    }

                    // If this property isn't done or has more steps, don't complete
                    if (progress < 1 || prop.next) {
                        shouldComplete = false;
                        hasRunningAnimation = true;
                    }
                }

                const easedProgress = prop.easing ? 
                    prop.easing(progress) : progress;

                this.updateValue(id, animation, easedProgress);
            }

            // logger.info(`  shouldComplete=${shouldComplete}, hasRunningAnimation=${hasRunningAnimation}`);

            // Only complete the animation if all properties are done
            if (shouldComplete && !hasRunningAnimation) {
                animation.running = false;
                toDelete.add(id);
                
                const callback = this.onCompleteCallbacks.get(id);
                if (callback) {
                    callback();
                    this.onCompleteCallbacks.delete(id);
                }
            }
        }

        // Delete completed animations
        toDelete.forEach(id => {
            this.animations.delete(id);
            // logger.info(`Deleted animation ${id}`);
        });
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

    public isRunning(id: string): boolean {
        const animation = this.animations.get(id);
        return animation?.running ?? false;
    }

    protected abstract interpolateValue(config: TConfig, progress: number): TValue;

    protected updateValue(id: string, config: TConfig, progress: number): void {
        const value = this.interpolateValue(config, progress);
        // logger.info(`Updating animation ${id} with value: ${JSON.stringify(value)}`);
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