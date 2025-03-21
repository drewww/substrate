import { Display } from '../display/display';
import { BlendMode } from '../display/types';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { logger } from '../util/logger';
import { SymbolComponent, SymbolConfig } from '../entity/components/symbol-component';
import { LightEmitterComponent, LightFalloff } from '../entity/components/light-emitter-component';
import { ValueAnimationModule } from '../animation/value-animation';
import { LIGHT_ANIMATIONS } from './light-animations';
import { ColorAnimationModule } from '../animation/color-animation';
import { Component } from '../entity/component';
import { WallComponent, WallDirection } from '../entity/components/wall-component';
import { computeFieldOfView } from 'wally-fov';
import { Renderer } from './renderer';
import { FacingComponent } from '../entity/components/facing-component';
import { Direction } from '../types';

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
        distanceFalloff: LightFalloff;
        angleFalloff?: LightFalloff;
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

const Z_INDEX = {
    WALL: 200,           // Walls above everything
    LIGHT: 100,          // Floor/general lighting
    ENTITY: 50           // Base entities below lighting
};

export abstract class BaseRenderer implements Renderer {
    protected entityTiles: Map<string, string> = new Map(); // entityId -> tileId
    protected tileEntities: Map<string, string> = new Map(); // tileId -> entityId
    protected lightSourceTiles: Map<string, Set<string>> = new Map(); // entityId -> Set<tileId>
    protected lightValueAnimations: ValueAnimationModule;
    protected lightColorAnimations: ColorAnimationModule;
    protected lightStates: Map<string, LightState> = new Map(); // entityId -> LightState
    protected wallTiles: Map<string, string> = new Map();  // entityId -> tileId
    protected lightsEnabled: boolean = true;  // Add this flag

    constructor(
        protected world: World,
        protected display: Display
    ) {
        this.lightValueAnimations = new ValueAnimationModule((id, value) => {
            const state = this.lightStates.get(id);

            // logger.info(`Renderer received value animation update for ${id} with value ${JSON.stringify(value)}`);
            if (!state) return;
            
            // Update the current properties based on animations
            if (value.intensity !== undefined) {
                state.currentProperties.intensity = value.intensity;
            }
            if (value.radius !== undefined) {
                state.currentProperties.radius = value.radius;
            }
            if (value.xOffset !== undefined) {
                state.currentProperties.xOffset = value.xOffset;
            }
            if (value.yOffset !== undefined) {
                state.currentProperties.yOffset = value.yOffset;
            }
            if (value.facing !== undefined) {
                state.currentProperties.facing = value.facing;
            }
            if (value.width !== undefined) {
                state.currentProperties.width = value.width;
            }

            const entity = this.world.getEntity(id);
            if (entity) {
                this.renderLightTiles(entity, state);

                // Check if animation is complete and should be removed
                this.checkRemoveOnComplete(entity, id);
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

                // Add the same check here for color animations
                this.checkRemoveOnComplete(entity, id);
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
        this.world.on('componentRemoved', ({ entity, componentType, component }) => this.onComponentRemoved(entity, componentType, component));

        if(this.world.getAllEntities().length > 0) {
            for(const entity of this.world.getAllEntities()) {
                this.onEntityAdded(entity);
            }
        }

        // Set up tile moved callback
        // this.display.setTileMovedCallback((tileId: string, x: number, y: number) => {
        //     const entityId = this.tileEntities.get(tileId);
        //     if (entityId) {
        //         const entity = this.world.getEntity(entityId);
        //         if (entity && entity.hasComponent('lightEmitter')) {
        //             const state = this.lightStates.get(entityId);
        //             if (state) {
        //                 this.renderLightTiles(entity, state);
        //             }
        //         }
        //     }
        // });
    }

    /**
     * Handle entity addition
     */
    protected onEntityAdded(entity: Entity): void {
        // Handle symbol component if present
        const symbolComponent = entity.getComponent('symbol') as SymbolComponent;
        if (symbolComponent) {
            const tileId = this.createOrUpdateSymbolTile(entity, symbolComponent);
            
            this.entityTiles.set(entity.getId(), tileId);
            this.tileEntities.set(tileId, entity.getId());

            // Add animations if configured
            if (symbolComponent.animations) {
                this.handleSymbolAnimations(tileId, symbolComponent.animations);
            }
        }
        
        // Handle light emitter independently
        if (entity.hasComponent('lightEmitter')) {
            // logger.info(`Renderer received entityAdded event for ${entity.getId()} with lightEmitter component: ${JSON.stringify(entity.getComponent('lightEmitter'))}`);
            this.addEntityLight(entity);
            // Register for move callbacks when light emitter is added
            const tileId = this.entityTiles.get(entity.getId());
            if (tileId) {
                this.display.setTileMoveCallback(tileId, (tileId, x, y) => {
                    const state = this.lightStates.get(entity.getId());
                    if (state) {
                        this.renderLightTiles(entity, state);
                    }
                });
            }
        }

        // Handle wall component if present
        const wallComponent = entity.getComponent('wall') as WallComponent;
        if (wallComponent) {
            this.addEntityWalls(entity);
        }

        this.handleEntityAdded(entity);
    }

    /**
     * Handle component addition/removal
     */
    protected onEntityModified(entity: Entity, componentType: string): void {
        this.handleEntityModified(entity, componentType);

        if (componentType === 'wall') {
            this.updateEntityWalls(entity);
        }
    }

    /**
     * Handle component value changes
     */
    protected onComponentModified(entity: Entity, componentType: string): void {
        this.handleComponentModified(entity, componentType);

        if (componentType === 'symbol') {
            const tileId = this.entityTiles.get(entity.getId());
            const symbol = entity.getComponent('symbol') as SymbolComponent;
            if (tileId && symbol) {
                // Just update the tile properties without touching animations
                this.display.updateTile(tileId, {
                    char: symbol.char,
                    fg: symbol.foreground,
                    bg: symbol.background,
                    // Only include other properties if they're explicitly set
                    ...(symbol.zIndex !== undefined && { zIndex: symbol.zIndex }),
                    ...(symbol.offsetSymbolX !== undefined && { offsetSymbolX: symbol.offsetSymbolX }),
                    ...(symbol.offsetSymbolY !== undefined && { offsetSymbolY: symbol.offsetSymbolY }),
                    ...(symbol.scaleSymbolX !== undefined && { scaleSymbolX: symbol.scaleSymbolX }),
                    ...(symbol.scaleSymbolY !== undefined && { scaleSymbolY: symbol.scaleSymbolY }),
                    ...(symbol.rotation !== undefined && { rotation: symbol.rotation }),
                    ...(symbol.blendMode !== undefined && { blendMode: symbol.blendMode as BlendMode }),
                });
            }
        } 

        if (componentType === 'wall') {
            const wallComponent = entity.getComponent('wall') as WallComponent;
            // Only remove tiles if both walls are empty
            const northEmpty = wallComponent.north.properties.every(prop => !prop);
            const westEmpty = wallComponent.west.properties.every(prop => !prop);
            
            if (northEmpty && westEmpty) {
                ['north', 'south', 'east', 'west'].forEach(dir => {
                    const tileId = this.wallTiles.get(`${entity.getId()}_${dir}`);
                    if (tileId) {
                        this.display.removeTile(tileId);
                        this.wallTiles.delete(`${entity.getId()}_${dir}`);
                    }
                });
            } else {
                // Otherwise just update the walls
                this.updateEntityWalls(entity);
            }
        }


        if (componentType === 'lightEmitter') {
            const state = this.lightStates.get(entity.getId());
            const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;

            // logger.warn("lightEmitter component modified: ", entity.getId() + " " + JSON.stringify(lightEmitter));

            if (!state) {
                // If no state exists, treat this like a new light emitter
                this.addEntityLight(entity);
                // Add move callback here too
                const tileId = this.entityTiles.get(entity.getId());
                if (tileId) {
                    this.display.setTileMoveCallback(tileId, (tileId, x, y) => {
                        const state = this.lightStates.get(entity.getId());
                        if (state) {
                            this.renderLightTiles(entity, state);
                        }
                    });
                }
            } else if (lightEmitter) {
                // Update existing state
                state.currentProperties.radius = lightEmitter.config.radius ?? state.baseProperties.radius;
                state.currentProperties.intensity = lightEmitter.config.intensity ?? state.baseProperties.intensity;
                state.currentProperties.color = lightEmitter.config.color ?? state.baseProperties.color;
                state.currentProperties.facing = lightEmitter.config.facing ?? state.baseProperties.facing;
                state.currentProperties.width = lightEmitter.config.width ?? state.baseProperties.width;
                state.currentProperties.xOffset = lightEmitter.config.xOffset ?? 0;
                state.currentProperties.yOffset = lightEmitter.config.yOffset ?? 0;

                this.renderLightTiles(entity, state);
            }
        }
        if(componentType === 'facing') {
            const facing = entity.getComponent('facing') as FacingComponent;
            if(facing) {
                const symbol = entity.getComponent('symbol') as SymbolComponent;
                if(symbol) {
                    const effectiveRotation = this.getEffectiveSymbolRotation(entity, symbol);

                    const tileId = this.entityTiles.get(entity.getId());
                    if(tileId) {
                        this.display.updateTile(tileId, {
                            rotation: effectiveRotation/180 * Math.PI
                        });
                    }
                }
            }
        }
    }

    /**
     * Handle entity removal
     */
    protected onEntityRemoved(entity: Entity): void {
        logger.debug(`Renderer received entityRemoved event for entity ${entity.getId()}`);
        const tileId = this.entityTiles.get(entity.getId());
        
        if (tileId) {
            // Clear animations before removing tile
            this.display.clearAnimations(tileId);
            
            this.tileEntities.delete(tileId);
            this.entityTiles.delete(entity.getId());
            this.display.removeTile(tileId);
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
        
        // Clean up wall tiles
        ['north', 'south', 'east', 'west'].forEach(dir => {
            const tileId = this.wallTiles.get(`${entity.getId()}_${dir}`);
            if (tileId) {
                this.display.removeTile(tileId);
                this.wallTiles.delete(`${entity.getId()}_${dir}`);
            }
        });
        
        this.handleEntityRemoved(entity);
    }

    /**
     * Handle component removal
     */
    protected onComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        if (componentType === 'lightEmitter') {
            // If the component was removed (no longer exists on entity)
            if (!entity.hasComponent('lightEmitter')) {
                // Remove move callback when light emitter is removed
                const tileId = this.entityTiles.get(entity.getId());
                if (tileId) {
                    this.display.removeTileMoveCallback(tileId);
                }
                
                // Clean up light tiles
                const lightTiles = this.lightSourceTiles.get(entity.getId());
                if (lightTiles) {
                    lightTiles.forEach(tileId => this.display.removeTile(tileId));
                    this.lightSourceTiles.delete(entity.getId());
                }
                
                // Clean up light state
                this.lightStates.delete(entity.getId());
                this.lightValueAnimations.clear(entity.getId());
                this.lightColorAnimations.clear(entity.getId());
            }
        }

        if (componentType === 'wall') {
            // Track which tile IDs we've already removed to avoid duplicate removals
            const removedTileIds = new Set<string>();
            
            ['north', 'south', 'east', 'west'].forEach(dir => {
                const tileId = this.wallTiles.get(`${entity.getId()}_${dir}`);
                if (tileId && !removedTileIds.has(tileId)) {
                    this.display.removeTile(tileId);
                    removedTileIds.add(tileId);
                }
                this.wallTiles.delete(`${entity.getId()}_${dir}`);
            });
        }

        this.handleComponentRemoved(entity, componentType, component);
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

        // Re-render light tiles if entity has a light emitter
        // TBD this may not be working
        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        if (lightEmitter) {
            const state = this.lightStates.get(entity.getId());
            if (state) {
                // Then render the light tiles with the updated state
                this.renderLightTiles(entity, state);
            }
        }

        this.handleEntityMoved(entity, from, to);
    }

    public setLightsEnabled(enabled: boolean): void {
        this.lightsEnabled = enabled;
        
        // If disabling lights, clean up all existing light tiles
        if (!enabled) {
            for (const [entityId, tiles] of this.lightSourceTiles) {
                tiles.forEach(tileId => this.display.removeTile(tileId));
                tiles.clear();
                // Pass the entityId when clearing animations
                this.lightValueAnimations.clear(entityId);
                this.lightColorAnimations.clear(entityId);
            }
            this.lightSourceTiles.clear();
        }
    }

    protected addEntityLight(entity: Entity): void {
        // Early return if lights are disabled
        if (!this.lightsEnabled) return;

        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        if (!lightEmitter) return;

        // Initialize or update base state
        let state = this.lightStates.get(entity.getId());
        if (!state) {
            state = {
                baseProperties: {
                    color: lightEmitter.config.color ?? '#FFFFFF',
                    intensity: lightEmitter.config.intensity ?? 1.0,
                    radius: lightEmitter.config.radius ?? 5,
                    distanceFalloff: lightEmitter.config.distanceFalloff ?? 'quadratic',
                    xOffset: lightEmitter.config.xOffset ?? 0,
                    yOffset: lightEmitter.config.yOffset ?? 0,
                    facing: lightEmitter.config.facing ?? 0,
                    width: lightEmitter.config.width ?? (2 * Math.PI)
                },
                currentProperties: {
                    color: lightEmitter.config.color ?? '#FFFFFF',
                    intensity: lightEmitter.config.intensity ?? 1.0,
                    radius: lightEmitter.config.radius ?? 5,
                    xOffset: lightEmitter.config.xOffset ?? 0,
                    yOffset: lightEmitter.config.yOffset ?? 0,
                    facing: lightEmitter.config.facing ?? 0,
                    width: lightEmitter.config.width ?? (2 * Math.PI)
                }
            };
            this.lightStates.set(entity.getId(), state);
        }

        // Add animations if configured
        if (lightEmitter.config.animation) {
            const animConfig = LIGHT_ANIMATIONS[lightEmitter.config.animation.type];
            const params = lightEmitter.config.animation.params;

            // logger.info(`Adding value animations for ${entity.getId()}: ${JSON.stringify(animConfig)}`);

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
                    duration: animConfig.intensity.duration,
                    start: (1 + (animConfig.intensity.start - 1) * intensityMultiplier),
                    end: (1 + (animConfig.intensity.end - 1) * intensityMultiplier)
                };
            }

            // Handle radius animation
            if (animConfig.radius?.start !== undefined && 
                animConfig.radius?.end !== undefined) {
                valueAnimations.radius = {
                    ...animConfig.radius,
                    duration: animConfig.radius.duration,
                    start: animConfig.radius.start,
                    end: animConfig.radius.end
                };
            }

            // Handle xOffset animation
            if (animConfig.xOffset !== undefined ) {
                valueAnimations.xOffset = {
                    ...animConfig.xOffset,
                    duration: animConfig.xOffset.duration,
                };
            }

            // Handle yOffset animation
            if (animConfig.yOffset !== undefined ) {
                valueAnimations.yOffset = {
                    ...animConfig.yOffset,
                    duration: animConfig.yOffset.duration,
                };
            }

            // Handle facing animation
            if (animConfig.facing !== undefined) {
                valueAnimations.facing = {
                    ...animConfig.facing,
                    duration: animConfig.facing.duration,
                };
            }

            // Handle color animations separately
            if (animConfig.color?.start && animConfig.color?.end) {
                this.lightColorAnimations.add(
                    entity.getId(), 
                    {
                        color: {
                            ...animConfig.color,
                            duration: animConfig.color.duration,
                            start: animConfig.color.start,
                            end: animConfig.color.end
                        }
                    },
                    () => this.checkRemoveOnComplete(entity, entity.getId())
                );
            }

            // Handle width animation
            if (animConfig.width !== undefined) {
                valueAnimations.width = {
                    ...animConfig.width,
                    duration: animConfig.width.duration,
                };
            }

            // Add value animations if any exist
            if (Object.keys(valueAnimations).length > 0) {
                this.lightValueAnimations.add(
                    entity.getId(), 
                    valueAnimations,
                    () => this.checkRemoveOnComplete(entity, entity.getId())
                );
            }
        }

        // Initial render
        this.renderLightTiles(entity, state);
    }

    private renderLightTiles(entity: Entity, state: LightState): void {
        // Early return if lights are disabled
        if (!this.lightsEnabled) return;
        
        // logger.warn("renderLightTiles: ", entity.getId() + " " + JSON.stringify(state));

        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        if (!lightEmitter) {
            // logger.info(`No light emitter component found for ${entity.getId()}`);
            return;
        }

        const blendMode = lightEmitter.config.mode === 'fg' ? BlendMode.Overlay : BlendMode.Screen;
        
        // Clean up existing light tiles
        const existingTiles = this.lightSourceTiles.get(entity.getId());
        if (existingTiles) {
            existingTiles.forEach(tileId => this.display.removeTile(tileId));
            existingTiles.clear();
        }

        // logger.warn("cleaned up existding tiles");

        // Initialize with entity position as fallback
        let offsetPosition: Point = {
            x: entity.getPosition().x + state.currentProperties.xOffset,
            y: entity.getPosition().y + state.currentProperties.yOffset
        };

        // Try to get position from tile if it exists
        const entityTileId = this.entityTiles.get(entity.getId());
        if (entityTileId) {
            const tile = this.display.getTile(entityTileId);
            if (tile) {
                offsetPosition = {
                    x: (tile.x ?? 0) + state.currentProperties.xOffset,
                    y: (tile.y ?? 0) + state.currentProperties.yOffset
                };
            }
        }

        // Get visible tiles first, always check at least 1 tile radius for visibility
        const visibilityRadius = Math.max(1, state.currentProperties.radius);
        const visibleTiles = this.world.getVisibleTilesInRadius(
            { x: Math.round(offsetPosition.x), y: Math.round(offsetPosition.y) }, 
            visibilityRadius
        );

        // logger.warn("visibleTiles: ", visibleTiles.size);

        // If no visible tiles, exit early
        if (visibleTiles.size === 0) {
            logger.info(`No visible tiles for ${entity.getId()}`);
            return;
        }

        const newTiles = new Set<string>();
        const radius = state.currentProperties.radius;
        const isDirectional = state.currentProperties.width < 2*Math.PI;

        const skipSourceTile = !lightEmitter.config.lightSourceTile;
        const sourcePos = { 
            x: Math.round(offsetPosition.x), 
            y: Math.round(offsetPosition.y) 
        };

        // Get FOV map and compute FOV for this light source
        const fovMap = this.world.getFOVMap();
        const fov = computeFieldOfView(
            fovMap,
            Math.round(offsetPosition.x),
            Math.round(offsetPosition.y),
            Math.ceil(radius)
        );

        // logger.warn("fov: ", fov.getVisible(sourcePos.x, sourcePos.y));

        const tileIntensities = new Map<string, number>();
        
        // Initialize directional variables with defaults
        let facing = 0;
        let startAngle = -Math.PI;
        let endAngle = Math.PI;
        let isWrapping = false;

        // Update angles for directional lights
        if (isDirectional) {
            facing = this.normalizeAngle(state.currentProperties.facing);
            const width = state.currentProperties.width ?? Math.PI / 4;
            const halfWidth = width / 2;
            startAngle = this.normalizeAngle(facing - halfWidth);
            endAngle = this.normalizeAngle(facing + halfWidth);
            isWrapping = startAngle > endAngle;
        }

        // Common sampling loop
        for (let dist = 0; dist <= radius; dist++) {
            // For non-directional lights, we need more samples at larger distances
            // For directional lights, we need consistent angular resolution
            const samplesNeeded = isDirectional ? 
                Math.max(8, Math.ceil(dist * 8)) : 
                Math.max(16, Math.ceil(dist * Math.PI * 4));  // Double the sampling density
            const angleStep = (2 * Math.PI) / samplesNeeded;

            for (let i = 0; i < samplesNeeded; i++) {
                const angle = this.normalizeAngle(i * angleStep);
                const dx = Math.cos(angle);
                const dy = -Math.sin(angle);

                // Skip if outside directional light cone
                if (isDirectional) {
                    const normalizedAngle = this.normalizeAngle(angle);
                    const inBeam = isWrapping ?
                        (normalizedAngle >= startAngle || normalizedAngle <= endAngle) :
                        (normalizedAngle >= startAngle && normalizedAngle <= endAngle);
                    if (!inBeam) continue;
                }

                // Check line of sight along the ray
                let blocked = false;
                for (let step = 0; step <= dist; step++) {
                    const checkX = Math.round(offsetPosition.x + dx * step);
                    const checkY = Math.round(offsetPosition.y + dy * step);
                    
                    // If we hit a wall, block all further light propagation along this ray
                    if (!fov.getVisible(checkX, checkY)) {
                        blocked = true;
                        break;
                    }
                }
                
                if (blocked) continue;

                const x = Math.round(offsetPosition.x + dx * dist);
                const y = Math.round(offsetPosition.y + dy * dist);

                const normalizedAngle = this.normalizeAngle(angle);
                const inBeam = isWrapping ?
                    (normalizedAngle >= startAngle || normalizedAngle <= endAngle) :
                    (normalizedAngle >= startAngle && normalizedAngle <= endAngle);

                if (!inBeam) continue;

                const tileKey = `${x},${y}`;
                if (!visibleTiles.has(this.world.pointToKey({x, y}))) {
                    continue;
                }

                // Calculate intensity with optional angular falloff
                let intensity = this.calculateFalloff(
                    dist,
                    state.currentProperties.radius,
                    state.currentProperties.intensity,
                    state.baseProperties.distanceFalloff
                );

                // Apply angular falloff for directional lights
                if (isDirectional) {
                    const angleDistance = Math.abs(this.getAngleDistance(this.normalizeAngle(angle), facing!));
                    const normalizedAngleDistance = angleDistance / (state.currentProperties.width! / 2);
                    const angleMultiplier = (state.currentProperties.width! <= Math.PI/16) ? 1.0 :
                        normalizedAngleDistance > 0.65 ? 
                            (1 - (normalizedAngleDistance - 0.65) / 0.35) :
                            1.0;
                    if (angleMultiplier <= 0) continue;
                    intensity *= angleMultiplier;
                }

                // Track maximum intensity per tile
                const currentIntensity = tileIntensities.get(tileKey) ?? 0;
                if (intensity > currentIntensity) {
                    tileIntensities.set(tileKey, intensity);
                }
            }
        }

        // Create light tiles using tracked intensities
        for (const [tileKey, intensity] of tileIntensities) {
            const [x, y] = tileKey.split(',').map(Number);
            if (skipSourceTile && x === sourcePos.x && y === sourcePos.y) {
                continue;
            }
            this.createLightTile(x, y, intensity, state.currentProperties.color, newTiles, blendMode);
            // logger.warn("created light tile: ", tileKey + " " + intensity);
        }

        // logger.info(`Setting light source tiles for ${entity.getId()} to ${newTiles.size} tiles`);
        this.lightSourceTiles.set(entity.getId(), newTiles);
    }

    // Helper method to create light tiles
    private createLightTile(x: number, y: number, intensity: number, color: string, newTiles: Set<string>, blendMode: BlendMode) {
        // Clamp intensity between 0 and 1
        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        const baseColor = color.slice(0, 7);
        const alpha = Math.floor(clampedIntensity * 255).toString(16).padStart(2, '0');
        const fullColor = `${baseColor}${alpha}`;
        
        // Create the main light tile
        const tileId = this.display.createTile(
            x, y,
            ' ',
            '#FFFFFF00',
            fullColor,
            100,
            { blendMode }
        );
        newTiles.add(tileId);

        // Check for walls in all directions and create overlays
        for (const direction of [WallDirection.NORTH, WallDirection.SOUTH, WallDirection.EAST, WallDirection.WEST]) {
            const [renderWall, opaqueWall, impassableWall] = this.world.hasWall({ x, y }, direction);
            if (opaqueWall) {
                // Create overlay for this wall
                const overlayId = this.display.createTile(
                    // For SOUTH walls, create overlay at (x, y+1)
                    // For EAST walls, create overlay at (x+1, y)
                    direction === WallDirection.SOUTH ? x : direction === WallDirection.EAST ? x + 1 : x,
                    direction === WallDirection.SOUTH ? y + 1 : direction === WallDirection.EAST ? y : y,
                    ' ',
                    '#FFFFFF00',
                    '#FFFFFF00',
                    1000, // Slightly above the light tile
                    { 
                        blendMode,
                        walls: [
                            // SOUTH walls become NORTH walls on the tile below
                            // EAST walls become WEST walls on the tile to the right
                            direction === WallDirection.NORTH || direction === WallDirection.SOUTH, 
                            direction === WallDirection.WEST || direction === WallDirection.EAST
                        ],
                        wallOverlays: [{
                            direction: direction === WallDirection.SOUTH ? 'north' : 
                                     direction === WallDirection.EAST ? 'west' :
                                     direction === WallDirection.NORTH ? 'north' : 'west',
                            color: fullColor,
                            blendMode
                        }]
                    }
                );
                newTiles.add(overlayId);
            }
        }
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

    private calculateFalloff(distance: number, radius: number, intensity: number, type: LightFalloff): number {
        // Special case for radius 0 - only light up the center tile
        if (radius === 0) {
            return distance === 0 ? intensity : 0;
        }

        const normalized = Math.max(0, 1 - (distance / radius));
        switch (type) {
            case 'linear':
                return normalized * intensity;
            case 'quadratic':
                return (normalized * normalized) * intensity;
            case 'exponential':
                return Math.pow(normalized, 4) * intensity;
            case 'step':
                return normalized <= 0.95 ? intensity : 0;
            case 'step-soft':
                return normalized <= 0.50 ? intensity : (normalized * 2) * intensity;
            case 'none':
                return 1;
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
        this.lightValueAnimations.update(timestamp);
        this.lightColorAnimations.update(timestamp);

        // Check all light emitters to see if they need re-rendering
        for (const [entityId, state] of this.lightStates) {
            const entity = this.world.getEntity(entityId);
            if (entity && entity.hasComponent('lightEmitter')) {
                // Get the player to check visibility
                const player = this.world.getPlayer();
                
                // Check if it's in visible range of the player
                // const isVisible = this.world.canEntitySeePosition(player, entity.getPosition());
                const isVisible = true;
                
                // If it's visible but has no light tiles, re-render it
                const existingTiles = this.lightSourceTiles.get(entityId);
                if (isVisible && (!existingTiles || existingTiles.size === 0)) {
                    this.renderLightTiles(entity, state);
                }
            }
        }
    }

    // Update abstract methods
    public abstract handleEntityAdded(entity: Entity): void;
    public abstract handleEntityModified(entity: Entity, componentType: string): void;
    public abstract handleComponentModified(entity: Entity, componentType: string): void;
    public abstract handleComponentRemoved(entity: Entity, componentType: string, component: Component): void;
    public abstract handleEntityRemoved(entity: Entity): void;
    public abstract handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;

    public abstract handleUpdate(timestamp: number): void;

    private getAngleDistance(angle1: number, angle2: number): number {
        const diff = Math.abs(angle1 - angle2);
        return Math.min(diff, 2 * Math.PI - diff);
    }

    // Helper method to check and handle removeOnComplete
    private checkRemoveOnComplete(entity: Entity, id: string): void {
        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        // logger.info(`Checking removeOnComplete for ${id} ${lightEmitter?.config.removeOnComplete} ${this.lightValueAnimations.isRunning(id)} ${this.lightColorAnimations.isRunning(id)}`);
        if (lightEmitter?.config.removeOnComplete && 
            !this.lightValueAnimations.isRunning(id) && 
            !this.lightColorAnimations.isRunning(id)) {
            entity.removeComponent('lightEmitter');
        }
    }

    private addEntityWalls(entity: Entity): void {
        const wallComponent = entity.getComponent('wall') as WallComponent;
        if (!wallComponent) return;

        const position = entity.getPosition();
        
        // Check if either wall exists
        const hasNorthWall = wallComponent.north.properties.some(prop => prop);
        const hasWestWall = wallComponent.west.properties.some(prop => prop);

        logger.info(`Adding entity walls for ${entity.getId()} ${hasNorthWall} ${hasWestWall}`);
        
        if (hasNorthWall || hasWestWall) {
            const wallTileId = this.display.createTile(
                position.x,
                position.y,
                '',
                '#FFFFFF',
                '#000000',
                Z_INDEX.WALL,
                {
                    walls: [hasNorthWall, hasWestWall],  // [north, west]
                    wallColors: [
                        hasNorthWall ? wallComponent.north.color : null,
                        hasWestWall ? wallComponent.west.color : null
                    ]
                }
            );
            
            // Store the same tile ID for all active directions
            if (hasNorthWall) {
                this.wallTiles.set(`${entity.getId()}_north`, wallTileId);
                this.wallTiles.set(`${entity.getId()}_south`, wallTileId);
            }
            if (hasWestWall) {
                this.wallTiles.set(`${entity.getId()}_west`, wallTileId);
                this.wallTiles.set(`${entity.getId()}_east`, wallTileId);
            }
        }
    }

    private updateEntityWalls(entity: Entity): void {
        logger.info(`Updating entity walls for ${entity.getId()}`);
        
        // Track which tile IDs we've already removed to avoid duplicate removals
        const removedTileIds = new Set<string>();
        
        ['north', 'south', 'east', 'west'].forEach(dir => {
            const tileId = this.wallTiles.get(`${entity.getId()}_${dir}`);
            if (tileId && !removedTileIds.has(tileId)) {
                this.display.removeTile(tileId);
                removedTileIds.add(tileId);
                // Only remove mappings when we actually remove the tile
                ['north', 'south', 'east', 'west'].forEach(direction => {
                    if (this.wallTiles.get(`${entity.getId()}_${direction}`) === tileId) {
                        this.wallTiles.delete(`${entity.getId()}_${direction}`);
                    }
                });
            }
        });

        // Add new wall tiles
        this.addEntityWalls(entity);
    }

    public getWorld(): World {
        return this.world;
    }

    private getEffectiveSymbolRotation(entity: Entity, symbol: SymbolComponent): number {
        if (!symbol.lockRotationToFacing) {
            return symbol.rotation;
        }

        const facing = entity.getComponent('facing') as FacingComponent;

        if (!facing || facing.direction === Direction.None) {
            return symbol.rotation;
        }

        const isPlayer = entity.hasComponent('player');
        let offset = 0;
        if (isPlayer) {
            offset = 180;
        }

        // Convert direction to rotation (in degrees)
        switch (facing.direction) {
            case Direction.North: return 0 + offset;
            case Direction.East: return 90 + offset;
            case Direction.South: return 180 + offset;
            case Direction.West: return 270 + offset;
            default: return symbol.rotation;
        }
    }

    // Add these new methods after the existing private methods but before the public methods
    private handleSymbolAnimations(tileId: string, animations: SymbolConfig['animations']): void {
        if (!animations) return;

        // Symbol animation

        // TODO: fix symbol animations
        // if (animations.symbol) {
        //     this.display.addSymbolAnimation(tileId, {
        //         symbols: animations.symbol.symbols,
        //         duration: animations.symbol.duration,
        //         loop: animations.symbol.loop
        //     });
        // }

        // Color animations
        if (animations.color) {
            if (animations.color.fg) {
                this.display.addColorAnimation(tileId, {
                    fg: animations.color.fg
                });
            }
            if (animations.color.bg) {
                this.display.addColorAnimation(tileId, {
                    bg: animations.color.bg
                });
            }
        }

        // Value animations - merge instead of replace
        const valueAnimations: Record<string, any> = {};

        // Offset animations
        if (animations.offset) {
            if (animations.offset.x) {
                valueAnimations.offsetSymbolX = animations.offset.x;
            }
            if (animations.offset.y) {
                valueAnimations.offsetSymbolY = animations.offset.y;
            }
        }

        // Scale animations
        if (animations.scale) {
            if (animations.scale.x) {
                valueAnimations.scaleSymbolX = animations.scale.x;
            }
            if (animations.scale.y) {
                valueAnimations.scaleSymbolY = animations.scale.y;
            }
        }

        // Rotation animation
        if (animations.rotation) {
            valueAnimations.rotation = animations.rotation;
        }

        // Add all value animations at once with merge flag
        if (Object.keys(valueAnimations).length > 0) {
            this.display.addValueAnimation(tileId, valueAnimations);
        }
    }

    private createOrUpdateSymbolTile(
        entity: Entity, 
        symbolComponent: SymbolComponent, 
        existingTileId?: string
    ): string {
        const position = entity.getPosition();
        const effectiveRotation = this.getEffectiveSymbolRotation(entity, symbolComponent);
        
        const tileConfig = {
            char: symbolComponent.char,
            fg: symbolComponent.foreground,
            bg: symbolComponent.background,
            zIndex: symbolComponent.zIndex,
            alwaysRenderIfExplored: symbolComponent.alwaysRenderIfExplored,
            rotation: effectiveRotation/180 * Math.PI,
            offsetSymbolX: symbolComponent.offsetSymbolX,
            offsetSymbolY: symbolComponent.offsetSymbolY,
            scaleSymbolX: symbolComponent.scaleSymbolX,
            scaleSymbolY: symbolComponent.scaleSymbolY,
            fontWeight: symbolComponent.fontWeight,
            fontStyle: symbolComponent.fontStyle,
            fontFamily: symbolComponent.fontFamily,
            blendMode: symbolComponent.blendMode as BlendMode
        };

        if (existingTileId) {
            this.display.updateTile(existingTileId, tileConfig);
            return existingTileId;
        } else {
            const tileId = this.display.createTile(
                position.x,
                position.y,
                tileConfig.char,
                tileConfig.fg,
                tileConfig.bg,
                tileConfig.zIndex,
                tileConfig
            );
            return tileId;
        }
    }
}  