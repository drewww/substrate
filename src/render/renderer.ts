import { BlendMode, Display } from '../display/display';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { logger } from '../util/logger';
import { SymbolComponent } from '../entity/components/symbol-component';
import { LightEmitterComponent } from '../entity/components/light-emitter-component';
import { ValueAnimationModule } from '../animation/value-animation';
import { LIGHT_ANIMATIONS } from './light-animations';
import { ColorAnimationModule } from '../animation/color-animation';
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
        xOffset: number;
        yOffset: number;
        facing: number;
        width: number;
    };
    currentProperties: {
        color: string;
        intensity: number;
        radius: number;
        xOffset: number;
        yOffset: number;
        facing: number;
        width: number;
    };
}

export abstract class Renderer {
    protected entityTiles: Map<string, string> = new Map(); // entityId -> tileId
    private lightSourceTiles: Map<string, Set<string>> = new Map(); // entityId -> Set<tileId>
    private lightValueAnimations: ValueAnimationModule;
    private lightColorAnimations: ColorAnimationModule;
    private lightStates: Map<string, LightState> = new Map(); // entityId -> LightState

    constructor(
        protected world: World,
        protected display: Display
    ) {
        this.lightValueAnimations = new ValueAnimationModule((id, value) => {
            const state = this.lightStates.get(id);
            if (!state) return;
            
            // Update the current properties based on animations
            if (value.intensity !== undefined) {
                state.currentProperties.intensity = value.intensity;
            }
            if (value.radius !== undefined) {
                state.currentProperties.radius = value.radius;
            }
            // Add handling for offset animations
            if (value.xOffset !== undefined) {
                state.currentProperties.xOffset = value.xOffset;
            }
            if (value.yOffset !== undefined) {
                state.currentProperties.yOffset = value.yOffset;
            }

            const entity = this.world.getEntity(id);
            if (entity) {
                this.renderLightTiles(entity, state);
            }
        });

        this.lightColorAnimations = new ColorAnimationModule((id, value) => {
            const state = this.lightStates.get(id);
            if (!state) return;
            
            if (value.color !== undefined) {
                state.currentProperties.color = value.color;
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
        this.lightColorAnimations.clear(entity.getId());
        
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
                    falloff: lightEmitter.config.falloff,
                    xOffset: lightEmitter.config.xOffset ?? 0,
                    yOffset: lightEmitter.config.yOffset ?? 0,
                    facing: lightEmitter.config.facing ?? 0,
                    width: lightEmitter.config.width ?? 0
                },
                currentProperties: {
                    color: lightEmitter.config.color,
                    intensity: lightEmitter.config.intensity,
                    radius: lightEmitter.config.radius,
                    xOffset: lightEmitter.config.xOffset ?? 0,
                    yOffset: lightEmitter.config.yOffset ?? 0,
                    facing: lightEmitter.config.facing ?? 0,
                    width: lightEmitter.config.width ?? 0
                }
            };
            this.lightStates.set(entity.getId(), state);
        }

        // Add animations if configured
        if (lightEmitter.config.animation) {
            const animConfig = LIGHT_ANIMATIONS[lightEmitter.config.animation.type];
            const params = lightEmitter.config.animation.params;
            
            const speedMultiplier = params?.speed === 'fast' ? 0.5 : 
                                  params?.speed === 'slow' ? 2.0 : 1.0;
            const intensityMultiplier = params?.intensity ?? 1.0;

            // Clear existing animations
            this.lightValueAnimations.clear(entity.getId());
            this.lightColorAnimations.clear(entity.getId());

            // Handle numeric animations
            const valueAnimations: Record<string, any> = {};

            // Handle intensity animation
            if (animConfig.intensity?.start !== undefined && 
                animConfig.intensity?.end !== undefined) {
                valueAnimations.intensity = {
                    ...animConfig.intensity,
                    duration: animConfig.intensity.duration * speedMultiplier,
                    start: state.baseProperties.intensity * 
                           (1 + (animConfig.intensity.start - 1) * intensityMultiplier),
                    end: state.baseProperties.intensity * 
                         (1 + (animConfig.intensity.end - 1) * intensityMultiplier)
                };
            }

            // Handle radius animation
            if (animConfig.radius?.start !== undefined && 
                animConfig.radius?.end !== undefined) {
                valueAnimations.radius = {
                    ...animConfig.radius,
                    duration: animConfig.radius.duration * speedMultiplier,
                    start: state.baseProperties.radius * animConfig.radius.start,
                    end: state.baseProperties.radius * animConfig.radius.end
                };
            }

            // Handle xOffset animation
            if (animConfig.xOffset !== undefined ) {
                valueAnimations.xOffset = {
                    ...animConfig.xOffset,
                    duration: animConfig.xOffset.duration * speedMultiplier,
                };
            }

            // Handle yOffset animation
            if (animConfig.yOffset !== undefined ) {
                valueAnimations.yOffset = {
                    ...animConfig.yOffset,
                    duration: animConfig.yOffset.duration * speedMultiplier,
                };
            }

            // Handle color animations separately
            if (animConfig.color?.start && animConfig.color?.end) {
                this.lightColorAnimations.add(entity.getId(), {
                    color: {
                        ...animConfig.color,
                        duration: animConfig.color.duration * speedMultiplier,
                        start: animConfig.color.start,
                        end: animConfig.color.end
                    }
                });
            }

            // Add value animations if any exist
            if (Object.keys(valueAnimations).length > 0) {
                this.lightValueAnimations.add(entity.getId(), valueAnimations);
            }
        }

        // Initial render
        this.renderLightTiles(entity, state);
    }

    private renderLightTiles(entity: Entity, state: LightState): void {
        // Clean up existing light tiles
        const existingTiles = this.lightSourceTiles.get(entity.getId());
        if (existingTiles) {
            existingTiles.forEach(tileId => this.display.removeTile(tileId));
            existingTiles.clear();
        }

        const entityTileId = this.entityTiles.get(entity.getId());
        if (!entityTileId) return;

        const tile = this.display.getTile(entityTileId);
        if (!tile) return;
        
        // Calculate actual position with offsets
        const offsetPosition = {
            x: (tile.x ?? tile.x) + state.currentProperties.xOffset,
            y: (tile.y ?? tile.y) + state.currentProperties.yOffset
        };

        // Get visible tiles first
        const visibleTiles = this.world.getVisibleTilesInRadius(
            { x: Math.round(offsetPosition.x), y: Math.round(offsetPosition.y) }, 
            state.currentProperties.radius
        );

        // If no visible tiles, exit early
        if (visibleTiles.size === 0) return;

        const newTiles = new Set<string>();
        const radius = Math.ceil(state.currentProperties.radius);
        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        const isDirectional = lightEmitter.config.facing !== undefined;

        if (isDirectional) {
            const facing = lightEmitter.config.facing ?? 0;
            const dx = Math.cos(facing);
            const dy = -Math.sin(facing);

            for (let dist = 0; dist <= radius; dist++) {
                const x = Math.round(offsetPosition.x + dx * dist);
                const y = Math.round(offsetPosition.y + dy * dist);

                // Check bounds and visibility first
                if (!visibleTiles.has(this.world.pointToKey({x, y}))) {
                    break;  // Stop at first non-visible tile
                }

                const intensity = this.calculateFalloff(
                    dist,
                    state.currentProperties.radius,
                    state.currentProperties.intensity,
                    state.baseProperties.falloff
                );
                
                this.createLightTile(x, y, intensity, state.currentProperties.color, newTiles);
            }
        } else {
            // Pre-calculate bounds based on visible tiles
            const bounds = this.calculateVisibleBounds(visibleTiles);
            
            // Only iterate over the intersection of radius and visible bounds
            for (let y = Math.max(bounds.minY, Math.floor(offsetPosition.y - radius)); 
                 y <= Math.min(bounds.maxY, Math.ceil(offsetPosition.y + radius)); y++) {
                for (let x = Math.max(bounds.minX, Math.floor(offsetPosition.x - radius)); 
                     x <= Math.min(bounds.maxX, Math.ceil(offsetPosition.x + radius)); x++) {
                    
                    if (!visibleTiles.has(this.world.pointToKey({x, y}))) {
                        continue;
                    }

                    const dx = x - offsetPosition.x;
                    const dy = y - offsetPosition.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > state.currentProperties.radius) continue;

                    const intensity = this.calculateFalloff(
                        distance,
                        state.currentProperties.radius,
                        state.currentProperties.intensity,
                        state.baseProperties.falloff
                    );
                    
                    this.createLightTile(x, y, intensity, state.currentProperties.color, newTiles);
                }
            }
        }

        this.lightSourceTiles.set(entity.getId(), newTiles);
    }

    // Helper method to create light tiles
    private createLightTile(x: number, y: number, intensity: number, color: string, newTiles: Set<string>) {
        const baseColor = color.slice(0, 7);
        const tileId = this.display.createTile(
            x, y,
            ' ',
            '#FFFFFF00',
            `${baseColor}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`,
            100,
            { blendMode: BlendMode.Screen }
        );
        newTiles.add(tileId);
    }

    // Helper to calculate bounds of visible tiles
    private calculateVisibleBounds(visibleTiles: Set<string>) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const key of visibleTiles) {
            const point = this.world.keyToPoint(key);
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        return { minX, maxX, minY, maxY };
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

    // Helper to normalize angle to [-π, π]
    private normalizeAngle(angle: number): number {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    // Update animation cycle
    public update(timestamp: number): void {
        // logger.info(`Renderer updating at ${timestamp}`);
        this.lightValueAnimations.update(timestamp);
        this.lightColorAnimations.update(timestamp);
    }

    // Update abstract methods
    protected abstract handleEntityAdded(entity: Entity, tileId: string): void;
    protected abstract handleEntityModified(entity: Entity, componentType: string): void;
    protected abstract handleComponentModified(entity: Entity, componentType: string): void;
    protected abstract handleEntityRemoved(entity: Entity): void;
    protected abstract handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;
}  