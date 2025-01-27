import { Display } from '../display/display';
import { BlendMode } from '../display/types';
import { Entity } from '../entity/entity';
import { World } from '../world/world';
import { Point } from '../types';
import { logger } from '../util/logger';
import { SymbolComponent } from '../entity/components/symbol-component';
import { LightEmitterComponent, LightFalloff } from '../entity/components/light-emitter-component';
import { ValueAnimationModule } from '../animation/value-animation';
import { LIGHT_ANIMATIONS } from './light-animations';
import { ColorAnimationModule } from '../animation/color-animation';
import { Component } from '../entity/component';
import { WallComponent, WallDirection } from '../entity/components/wall-component';
import { computeFieldOfView } from 'wally-fov';
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

export abstract class Renderer {
    protected entityTiles: Map<string, string> = new Map(); // entityId -> tileId
    private lightSourceTiles: Map<string, Set<string>> = new Map(); // entityId -> Set<tileId>
    private lightValueAnimations: ValueAnimationModule;
    private lightColorAnimations: ColorAnimationModule;
    private lightStates: Map<string, LightState> = new Map(); // entityId -> LightState
    private wallTiles: Map<string, string> = new Map();  // entityId -> tileId

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
        this.display.setTileMovedCallback((tileId: string, x: number, y: number) => {
            // Find entity that owns this tile
            for (const [entityId, entityTileId] of this.entityTiles) {
                if (entityTileId === tileId) {
                    const entity = this.world.getEntity(entityId);
                    if (entity && entity.hasComponent('lightEmitter')) {
                        const state = this.lightStates.get(entityId);
                        if (state) {
                            this.renderLightTiles(entity, state);
                        }
                    }
                    break;
                }
            }
        });
    }

    /**
     * Handle entity addition
     */
    protected onEntityAdded(entity: Entity): void {
        // Handle symbol component if present
        const symbolComponent = entity.getComponent('symbol') as SymbolComponent;
        if (symbolComponent) {
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
            this.handleEntityAdded(entity, tileId);
        }
        
        // Handle light emitter independently
        if (entity.hasComponent('lightEmitter')) {
            logger.info(`Renderer received entityAdded event for ${entity.getId()} with lightEmitter component: ${JSON.stringify(entity.getComponent('lightEmitter'))}`);
            this.addEntityLight(entity);
        }

        // Handle wall component if present
        const wallComponent = entity.getComponent('wall') as WallComponent;
        if (wallComponent) {
            this.addEntityWalls(entity);
        }
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
                this.display.updateTile(tileId, {
                    char: symbol.char,
                    fg: symbol.foreground,
                    bg: symbol.background,
                    zIndex: symbol.zIndex,
                    alwaysRenderIfExplored: symbol.alwaysRenderIfExplored
                });
            }
        } 

        if (componentType === 'wall') {
            this.updateEntityWalls(entity);
        }
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
                // Clean up light tiles
                const lightTiles = this.lightSourceTiles.get(entity.getId());
                if (lightTiles) {
                    lightTiles.forEach(tileId => this.display.removeTile(tileId));
                    this.lightSourceTiles.delete(entity.getId());
                }
                
                // Clean up light state and animations
                this.lightStates.delete(entity.getId());
                this.lightValueAnimations.clear(entity.getId());
                this.lightColorAnimations.clear(entity.getId());
            }
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
                    distanceFalloff: lightEmitter.config.distanceFalloff,
                    xOffset: lightEmitter.config.xOffset ?? 0,
                    yOffset: lightEmitter.config.yOffset ?? 0,
                    facing: lightEmitter.config.facing ?? 0,
                    width: lightEmitter.config.width ?? (2 * Math.PI)
                },
                currentProperties: {
                    color: lightEmitter.config.color,
                    intensity: lightEmitter.config.intensity,
                    radius: lightEmitter.config.radius,
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

            logger.info(`Adding value animations for ${entity.getId()}: ${JSON.stringify(animConfig)}`);

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
        const lightEmitter = entity.getComponent('lightEmitter') as LightEmitterComponent;
        if (!lightEmitter) {
            logger.info(`No light emitter component found for ${entity.getId()}`);
            return;
        }

        const blendMode = lightEmitter.config.mode === 'fg' ? BlendMode.Overlay : BlendMode.Screen;
        
        // Clean up existing light tiles
        const existingTiles = this.lightSourceTiles.get(entity.getId());
        if (existingTiles) {
            existingTiles.forEach(tileId => this.display.removeTile(tileId));
            existingTiles.clear();
        }

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
        // logger.info(`Renderer updating at ${timestamp}`);
        this.lightValueAnimations.update(timestamp);
        this.lightColorAnimations.update(timestamp);
    }

    // Update abstract methods
    protected abstract handleEntityAdded(entity: Entity, tileId: string): void;
    protected abstract handleEntityModified(entity: Entity, componentType: string): void;
    protected abstract handleComponentModified(entity: Entity, componentType: string): void;
    protected abstract handleComponentRemoved(entity: Entity, componentType: string, component: Component): void;
    protected abstract handleEntityRemoved(entity: Entity): void;
    protected abstract handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;

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
            
            // Store single tile ID for both walls
            this.wallTiles.set(entity.getId(), wallTileId);
        }
    }

    private updateEntityWalls(entity: Entity): void {
        // Remove existing wall tile
        const tileId = this.wallTiles.get(entity.getId());
        if (tileId) {
            this.display.removeTile(tileId);
            this.wallTiles.delete(entity.getId());
        }

        // Add new wall tiles
        this.addEntityWalls(entity);
    }
}  