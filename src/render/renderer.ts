import { BlendMode, Display } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { logger } from '../util/logger';
import { SymbolComponent } from '../entity/components/symbol-component';
import { LightEmitterComponent } from '../entity/components/light-emitter-component';
import { ValueAnimationModule } from '../animation/value-animation';
import { LIGHT_ANIMATIONS, LightAnimationConfig } from './light-animations';
/**
 * Base renderer class that handles entity visualization
 * 
 * Events handled:
 * - entityModified: When components are added/removed from an entity
 * - entityMoved: When an entity's position changes
 * - componentModified: When values within a component are updated
 */
interface LightState {
    baseProperties: {
        color: string;
        intensity: number;
        radius: number;
        falloff: 'linear' | 'quadratic' | 'exponential';
    };
    currentProperties: {
        color: string;
        intensity: number;
        radius: number;
    };
}

export abstract class Renderer {
    protected entityTiles: Map<string, string> = new Map(); // entityId -> tileId
    private lightSourceTiles: Map<string, Set<string>> = new Map(); // entityId -> Set<tileId>
    private lightValueAnimations: ValueAnimationModule;
    private lightStates: Map<string, LightState> = new Map(); // entityId -> LightState

    constructor(
        protected world: World,
        protected display: Display
    ) {
        this.lightValueAnimations = new ValueAnimationModule((id, value) => {
            const state = this.lightStates.get(id);
            if (!state) return;

            logger.info(`Updating light state for entity ${id} with value: ${JSON.stringify(value)}`);
            
            // Update the current properties based on animations
            if (value.intensity !== undefined) {
                state.currentProperties.intensity = value.intensity;
            }
            if (value.radius !== undefined) {
                state.currentProperties.radius = value.radius;
            }

            const entity = this.world.getEntity(id);
            if (entity) {
                this.renderLightTiles(entity, state);
            }
        });

        this.display.addFrameCallback((display, timestamp) => {
            // logger.info(`Renderer received animation callback at ${timestamp}`);
            this.update(timestamp);
        });

        this.world.on('entityAdded', ({ entity }) => this.onEntityAdded(entity));
        this.world.on('entityRemoved', ({ entity }) => this.onEntityRemoved(entity));
        this.world.on('entityMoved', ({ entity, from, to }) => this.onEntityMoved(entity, from, to));
        this.world.on('entityModified', ({ entity, componentType }) => this.onEntityModified(entity, componentType));
        this.world.on('componentModified', ({ entity, componentType }) => this.onComponentModified(entity, componentType));
    }

    /**
     * Handle entity addition
     */
    protected onEntityAdded(entity: Entity): void {
        const symbolComponent = entity.getComponent('symbol') as SymbolComponent;
        if (!symbolComponent) {
            return; // Don't render entities without symbol components
        }

        const position = entity.getPosition();
        const tileId = this.display.createTile(
            position.x,
            position.y,
            symbolComponent.char,
            symbolComponent.foreground,
            symbolComponent.background,
            symbolComponent.zIndex,
            {
                alwaysRenderIfExplored: symbolComponent.alwaysRenderIfExplored
            }
        );
        
        this.entityTiles.set(entity.getId(), tileId);
        
        // Handle light emitter if present
        if (entity.hasComponent('lightEmitter')) {
            this.addEntityLight(entity);

            
        }
        
        this.handleEntityAdded(entity, tileId);
    }

    /**
     * Handle component addition/removal
     */
    protected onEntityModified(entity: Entity, componentType: string): void {
        if (componentType === 'symbol') {
            const tileId = this.entityTiles.get(entity.getId());
            const symbol = entity.getComponent('symbol') as SymbolComponent;
            if (tileId && symbol) {
                this.display.updateTile(tileId, {
                    char: symbol.char,
                    fg: symbol.foreground,
                    bg: symbol.background,
                    zIndex: symbol.zIndex
                });
            }
        }
        this.handleEntityModified(entity, componentType);
    }

    /**
     * Handle component value changes
     */
    protected onComponentModified(entity: Entity, componentType: string): void {
        this.handleComponentModified(entity, componentType);
    }

    /**
     * Handle entity removal
     */
    protected onEntityRemoved(entity: Entity): void {
        logger.debug(`Renderer received entityRemoved event for entity ${entity.getId()}`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            logger.debug(`Found tile ${tileId} for entity ${entity.getId()}, removing...`);
            this.display.removeTile(tileId);
            this.entityTiles.delete(entity.getId());
        } else {
            logger.warn(`No tile found for removed entity ${entity.getId()}`);
        }
        
        // Remove light tiles if they exist
        const lightTiles = this.lightSourceTiles.get(entity.getId());
        if (lightTiles) {
            lightTiles.forEach(tileId => this.display.removeTile(tileId));
            this.lightSourceTiles.delete(entity.getId());
        }
        
        // Clean up light state
        this.lightStates.delete(entity.getId());
        this.lightValueAnimations.clear(entity.getId());
        
        this.handleEntityRemoved(entity);
    }

    /**
     * Handle entity move
     */
    protected onEntityMoved(entity: Entity, from: Point, to: Point): void {
        logger.debug(`Renderer handling entity move for ${entity.getId()} to (${to.x},${to.y})`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            // Only do direct move if subclass doesn't handle it
            if (!this.handleEntityMoved(entity, from, to)) {
                this.display.moveTile(tileId, to.x, to.y);
            }
        } else {
            logger.warn(`No tile found for moved entity ${entity.getId()}`);
        }

        // Update light if entity has a light emitter
        if (entity.hasComponent('lightEmitter')) {
            this.addEntityLight(entity);
        }
        
        if (!this.handleEntityMoved(entity, from, to)) {
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                this.display.moveTile(tileId, to.x, to.y);
            }
        }
    }

    protected addEntityLight(entity: Entity): void {
        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        if (!lightEmitter) return;

        // Initialize or update base state
        let state = this.lightStates.get(entity.getId());
        if (!state) {
            state = {
                baseProperties: {
                    color: lightEmitter.config.color,
                    intensity: lightEmitter.config.intensity,
                    radius: lightEmitter.config.radius,
                    falloff: lightEmitter.config.falloff
                },
                currentProperties: {
                    color: lightEmitter.config.color,
                    intensity: lightEmitter.config.intensity,
                    radius: lightEmitter.config.radius
                }
            };
            this.lightStates.set(entity.getId(), state);
        }

        // Add animations if configured
        if (lightEmitter.config.animation) {
            const animConfig = LIGHT_ANIMATIONS[lightEmitter.config.animation.type];
            const params = lightEmitter.config.animation.params;
            
            // Apply animation with parameter modifications
            const speedMultiplier = params?.speed === 'fast' ? 0.5 : 
                                  params?.speed === 'slow' ? 2.0 : 1.0;
            const intensityMultiplier = params?.intensity ?? 1.0;

            // Create animation configuration
            const animations: Record<string, any> = {};

            if (animConfig.intensity && 'start' in animConfig.intensity && 'end' in animConfig.intensity) {
                animations.intensity = {
                    ...animConfig.intensity,
                    duration: animConfig.intensity.duration * speedMultiplier,
                    start: state.baseProperties.intensity * (1 + (animConfig.intensity.start - 1) * intensityMultiplier),
                    end: state.baseProperties.intensity * (1 + (animConfig.intensity.end - 1) * intensityMultiplier)
                };
            }

            if (animConfig.radius && 'start' in animConfig.radius && 'end' in animConfig.radius) {
                animations.radius = {
                    ...animConfig.radius,
                    duration: animConfig.radius.duration * speedMultiplier,
                    start: state.baseProperties.radius * animConfig.radius.start,
                    end: state.baseProperties.radius * animConfig.radius.end
                };
            }

            if (animConfig.color && 'start' in animConfig.color && 'end' in animConfig.color) {
                animations.color = {
                    ...animConfig.color,
                    duration: animConfig.color.duration * speedMultiplier
                };
            }

            logger.info(`Adding light animation for entity ${entity.getId()} with animations: ${JSON.stringify(animations)}`);
            this.lightValueAnimations.add(entity.getId(), animations);
        }

        // Update light tiles using current state
        this.renderLightTiles(entity, state);
    }

    private renderLightTiles(entity: Entity, state: LightState): void {
        // Clean up existing light tiles
        const existingTiles = this.lightSourceTiles.get(entity.getId());
        if (existingTiles) {
            existingTiles.forEach(tileId => this.display.removeTile(tileId));
            existingTiles.clear();
        }

        const position = entity.getPosition();
        const visibleTiles = this.world.getVisibleTilesInRadius(position, state.currentProperties.radius);
        const newTiles = new Set<string>();

        for (let y = position.y - state.currentProperties.radius; y <= position.y + state.currentProperties.radius; y++) {
            for (let x = position.x - state.currentProperties.radius; x <= position.x + state.currentProperties.radius; x++) {
                if (y < 0 || y >= this.world.getSize().y || 
                    x < 0 || x >= this.world.getSize().x ||
                    !visibleTiles.has(this.world.pointToKey({x, y}))) {
                    continue;
                }

                const distance = Math.sqrt(
                    Math.pow(x - position.x, 2) + 
                    Math.pow(y - position.y, 2)
                );
                
                if (distance <= state.currentProperties.radius) {
                    const intensity = this.calculateFalloff(
                        distance,
                        state.currentProperties.radius,
                        state.currentProperties.intensity,
                        state.baseProperties.falloff
                    );
                    
                    // TODO make this reflect the symbol component on the entity
                    const tileId = this.display.createTile(
                        x, y,
                        ' ',
                        '#FFFFFF00',
                        `${state.currentProperties.color}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`,
                        100,
                        { blendMode: BlendMode.Screen }
                    );

                    newTiles.add(tileId);
                }
            }
        }

        this.lightSourceTiles.set(entity.getId(), newTiles);
    }

    private calculateFalloff(distance: number, radius: number, intensity: number, type: 'linear' | 'quadratic' | 'exponential'): number {
        const normalized = Math.max(0, 1 - (distance / radius));
        switch (type) {
            case 'linear':
                return normalized * intensity;
            case 'quadratic':
                return (normalized * normalized) * intensity;
            case 'exponential':
                return Math.pow(normalized, 4) * intensity;
            default:
                return normalized * intensity;
        }
    }

    // Update animation cycle
    public update(timestamp: number): void {
        // logger.info(`Renderer updating at ${timestamp}`);
        this.lightValueAnimations.update(timestamp);
    }

    // Update abstract methods
    protected abstract handleEntityAdded(entity: Entity, tileId: string): void;
    protected abstract handleEntityModified(entity: Entity, componentType: string): void;
    protected abstract handleComponentModified(entity: Entity, componentType: string): void;
    protected abstract handleEntityRemoved(entity: Entity): void;
    protected abstract handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;
}  