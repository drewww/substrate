import { SerializedEntity } from '../entity/component';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Component } from '../entity/component';
import { logger } from '../util/logger';
import { FieldOfViewMap, computeFieldOfView, CardinalDirection } from 'wally-fov';
import { WallComponent, WallConfig, WallData, WallDirection, WallProperty } from '../entity/components/wall-component';
import { OpacityComponent } from '../entity/components/opacity-component';
import { VisionComponent } from '../entity/components/vision-component';

interface SerializedWorld {
    width: number;
    height: number;
    entities: SerializedEntity[];
}

export type WorldEventMap = {
    'entityAdded': { entity: Entity };
    'entityRemoved': { entity: Entity, position: Point };
    'entityMoved': { entity: Entity, from: Point, to: Point };
    'entityModified': { entity: Entity, componentType: string };
    'componentAdded': { entity: Entity, componentType: string };
    'componentRemoved': { entity: Entity, componentType: string };
    'componentModified': { entity: Entity, componentType: string };
    'fovChanged': {};
}
type WorldEventHandler<T extends keyof WorldEventMap> = (data: WorldEventMap[T]) => void;

export class World {
    private entities: Map<string, Entity> = new Map();
    private spatialMap: Map<string, Set<string>> = new Map();
    private eventHandlers = new Map<string, Set<WorldEventHandler<any>>>();
    private queuedEvents: Array<{ event: string, data: any }> = [];
    private batchingEvents = false;

    private buildingWorld = false;
    
    // Add event counters
    private eventCounts = new Map<keyof WorldEventMap, number>();
    private fovMap: FieldOfViewMap;
    
    // Add a map to track visible locations
    private playerVisibleLocations: Map<string, boolean> = new Map();
    
    private discoveredLocations: Set<string> = new Set();
    
    constructor(private readonly width: number, private readonly height: number) {
        // Initialize FOV map
        this.fovMap = new FieldOfViewMap(width, height);
        this.resetEventCounts();
    }

    private resetEventCounts(): void {
        this.eventCounts.clear();
        this.eventCounts.set('entityAdded', 0);
        this.eventCounts.set('entityRemoved', 0);
        this.eventCounts.set('entityMoved', 0);
        this.eventCounts.set('entityModified', 0);
        this.eventCounts.set('componentAdded', 0);
        this.eventCounts.set('componentRemoved', 0);
        this.eventCounts.set('componentModified', 0);
    }

    public unready(): void {
        this.buildingWorld = true;
    }

    public ready(): void {
        this.buildingWorld = false;
        this.rebuildFOVMap();
    }

    public getEventCounts(): Map<keyof WorldEventMap, number> {
        return new Map(this.eventCounts);
    }

    // A little odd letting this be public; should probably be in a util file somewhere??
    public pointToKey({ x, y }: Point): string {
        return `${x},${y}`;
    }

    /**
     * Convert a point key back to x,y coordinates
     */
    public keyToPoint(key: string): Point {
        const [x, y] = key.split(',').map(Number);
        return { x, y };
    }

    /**
     * Add an entity to the world
     * @throws Error if entity's position is out of bounds
     */
    public addEntity(entity: Entity): void {
        const position = entity.getPosition();
        if (position.x < 0 || position.x >= this.width || 
            position.y < 0 || position.y >= this.height) {
            throw new Error(`Position ${position.x},${position.y} is out of bounds`);
        }

        const entityId = entity.getId();
        entity.setWorld(this);
        this.entities.set(entityId, entity);

        const key = this.pointToKey(position);
        let entitiesAtPosition = this.spatialMap.get(key);
        if (!entitiesAtPosition) {
            entitiesAtPosition = new Set();
            this.spatialMap.set(key, entitiesAtPosition);
        }
        entitiesAtPosition.add(entityId);

        // Update FOV map if entity affects visibility
        if (entity.hasComponent('opacity')) {
            this.fovMap.addBody(position.x, position.y);
        }

        // Update player vision if this is a player
        if (entity.hasComponent('player')) {
            this.updatePlayerVision();
        }

        this.emit('entityAdded', { entity });
    }

    /**
     * Add multiple entities to the world at once
     * @throws Error if any entity's position is out of bounds
     */
    public addEntities(entities: Entity[]): void {
        // Validate all positions first to ensure atomicity
        for (const entity of entities) {
            const position = entity.getPosition();
            if (position.x < 0 || position.x >= this.width || 
                position.y < 0 || position.y >= this.height) {
                throw new Error(`Position ${position.x},${position.y} is out of bounds`);
            }
        }

        // Add all entities
        for (const entity of entities) {
            const position = entity.getPosition();
            const entityId = entity.getId();
            entity.setWorld(this);
            this.entities.set(entityId, entity);

            const key = this.pointToKey(position);
            let entitiesAtPosition = this.spatialMap.get(key);
            if (!entitiesAtPosition) {
                entitiesAtPosition = new Set();
                this.spatialMap.set(key, entitiesAtPosition);
            }
            entitiesAtPosition.add(entityId);
            
            this.emit('entityAdded', { entity });
        }
    }

    public moveEntity(entityId: string, newPosition: Point): boolean {
        // Bounds checking
        if (newPosition.x < 0 || newPosition.x >= this.width || 
            newPosition.y < 0 || newPosition.y >= this.height) {
            return false;
        }

        const entity = this.entities.get(entityId);
        if (!entity) {
            return false;
        }

        const oldPosition = entity.getPosition();
        const oldKey = this.pointToKey(oldPosition);
        const newKey = this.pointToKey(newPosition);

        // Update spatial map
        const oldSet = this.spatialMap.get(oldKey);
        oldSet?.delete(entityId);
        if (oldSet?.size === 0) {
            this.spatialMap.delete(oldKey);
        }

        let newSet = this.spatialMap.get(newKey);
        if (!newSet) {
            newSet = new Set();
            this.spatialMap.set(newKey, newSet);
        }
        newSet.add(entityId);

        // Update FOV map if needed
        if (entity.hasComponent('opacity')) {
            this.fovMap.removeBody(oldPosition.x, oldPosition.y);
            this.fovMap.addBody(newPosition.x, newPosition.y);
        }

        // Let the entity update its position
        entity.setPosition(newPosition.x, newPosition.y);

        // Emit move event
        this.onEntityMoved(entity, oldPosition, newPosition);

        return true;
    }

    public removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) {
            logger.warn(`Attempted to remove non-existent entity: ${entityId}`);
            return;
        }

        const position = entity.getPosition();
        
        // Update FOV map before removing
        this.updateFOVForEntity(entity, position);

        const key = this.pointToKey(position);
        const entitiesAtPosition = this.spatialMap.get(key);
        entitiesAtPosition?.delete(entityId);
        if (entitiesAtPosition?.size === 0) {
            this.spatialMap.delete(key);
        }

        this.entities.delete(entityId);
        
        this.emit('entityRemoved', { entity, position });
        logger.debug(`Entity ${entityId} removed from world`);
    }

    public getEntitiesAt(position: Point): Entity[] {
        const key = this.pointToKey(position);
        const entityIds = this.spatialMap.get(key);
        if (!entityIds) return [];

        return Array.from(entityIds)
            .map(id => this.entities.get(id))
            .filter((entity): entity is Entity => entity !== undefined);
    }

    public getSize(): Point {
        return { x: this.width, y: this.height };
    }

    public getAllEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    /**
     * Get all entities that have the specified tag
     */
    public getEntitiesByTag(tag: string): Entity[] {
        return Array.from(this.entities.values())
            .filter(entity => entity.hasTag(tag));
    }

    /**
     * Get all entities that have the specified component type
     */
    public getEntitiesWithComponent(componentType: string): Entity[] {
        return Array.from(this.entities.values())
            .filter(entity => entity.hasComponent(componentType));
    }

    /**
     * Get all entities that have all of the specified tags
     */
    public getEntitiesWithTags(tags: string[]): Entity[] {
        return Array.from(this.entities.values())
            .filter(entity => tags.every(tag => entity.hasTag(tag)));
    }

    /**
     * Get all entities that have all of the specified component types
     */
    public getEntitiesWithComponents(componentTypes: string[]): Entity[] {
        return Array.from(this.entities.values())
            .filter(entity => componentTypes.every(type => entity.hasComponent(type)));
    }

    /**
     * Remove multiple entities from the world at once
     * Silently ignores non-existent entity IDs
     */
    public removeEntities(entityIds: string[]): void {
        for (const entityId of entityIds) {
            const entity = this.entities.get(entityId);
            if (!entity) continue;

            const position = entity.getPosition();
            const key = this.pointToKey(position);
            const entitiesAtPosition = this.spatialMap.get(key);
            entitiesAtPosition?.delete(entityId);
            if (entitiesAtPosition?.size === 0) {
                this.spatialMap.delete(key);
            }

            this.entities.delete(entityId);
        }
    }

    /**
     * Serialize the world and all its entities to a JSON string
     */
    public serialize(): SerializedWorld {
        return {
            width: this.width,
            height: this.height,
            entities: Array.from(this.entities.values()).map(e => e.serialize())
        };
    }

    /**
     * Create a new world from a serialized string
     * @throws Error if the serialized data is invalid
     */
    public static deserialize(data: SerializedWorld): World {
        try {
            // Validate dimensions
            if (!data || data.width <= 0 || data.height <= 0) {
                throw new Error('Invalid world dimensions');
            }

            // Validate entities array exists
            if (!Array.isArray(data.entities)) {
                throw new Error('Invalid entities data');
            }

            const world = new World(data.width, data.height);
            world.clear();
            
            // Restore entities
            for (const entityData of data.entities) {
                try {
                    const entity = Entity.deserialize(entityData);
                    world.addEntity(entity);
                } catch (error) {
                    throw new Error(`Failed to deserialize entity: ${error}`);
                }
            }
            
            return world;
        } catch (error) {
            throw new Error(`Failed to deserialize world: ${error}`);
        }
    }

    /**
     * Get all entities within a rectangular area (inclusive)
     */
    public getEntitiesInArea(topLeft: Point, bottomRight: Point): Entity[] {
        // Normalize coordinates in case they're provided in wrong order
        const minX = Math.min(topLeft.x, bottomRight.x);
        const maxX = Math.max(topLeft.x, bottomRight.x);
        const minY = Math.min(topLeft.y, bottomRight.y);
        const maxY = Math.max(topLeft.y, bottomRight.y);

        // Bounds checking
        if (minX < 0 || maxX >= this.width || minY < 0 || maxY >= this.height) {
            throw new Error('Area bounds are outside world boundaries');
        }

        const entities = new Set<Entity>();

        // Scan the area and collect entities
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const entitiesAtPoint = this.getEntitiesAt({ x, y });
                entitiesAtPoint.forEach(entity => entities.add(entity));
            }
        }

        return Array.from(entities);
    }

    /**
     * Find the n nearest entities to a position
     * @param position The reference position
     * @param n Number of entities to return (default: 1)
     * @param predicate Optional filter for entities
     */
    public findNearestEntities(
        position: Point, 
        n: number = 1,
        predicate?: (entity: Entity) => boolean
    ): Entity[] {
        // Bounds checking
        if (position.x < 0 || position.x >= this.width || 
            position.y < 0 || position.y >= this.height) {
            throw new Error('Reference position is outside world boundaries');
        }

        const entities = predicate 
            ? this.getAllEntities().filter(predicate)
            : this.getAllEntities();

        return entities
            .map(entity => ({
                entity,
                distance: this.getManhattanDistance(position, entity.getPosition())
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, n)
            .map(({ entity }) => entity);
    }

    private getManhattanDistance(a: Point, b: Point): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    /**
     * Get statistics about the current world state
     */
    public getStats(): {
        entityCount: number,
        uniqueComponentTypes: number,
        uniqueTags: number,
        occupiedPositions: number
    } {
        const allComponents = new Set<string>();
        const allTags = new Set<string>();

        for (const entity of this.entities.values()) {
            entity.getComponents().forEach(comp => allComponents.add(comp.type));
            entity.getTags().forEach(tag => allTags.add(tag));
        }

        return {
            entityCount: this.entities.size,
            uniqueComponentTypes: allComponents.size,
            uniqueTags: allTags.size,
            occupiedPositions: this.spatialMap.size
        };
    }

    /**
     * Remove all entities from the world
     */
    public clear(): void {
        this.entities.clear();
        this.spatialMap.clear();
    }

    /**
     * Create a deep copy of the world
     */
    public clone(): World {
        const serialized = this.serialize();
        return World.deserialize(serialized);
    }

    /**
     * Check if the world is empty
     */
    public isEmpty(): boolean {
        return this.entities.size === 0;
    }

    /**
     * Batch update entity positions
     * @throws Error if any position is invalid or entity doesn't exist
     */
    public updatePositions(updates: Array<{ id: string, position: Point }>): void {
        // Validate all updates first
        for (const { id, position } of updates) {
            if (!this.entities.has(id)) {
                throw new Error(`Entity ${id} not found`);
            }
            if (position.x < 0 || position.x >= this.width || 
                position.y < 0 || position.y >= this.height) {
                throw new Error(`Position ${position.x},${position.y} is out of bounds`);
            }
        }

        // Apply all updates
        for (const { id, position } of updates) {
            this.moveEntity(id, position);
        }
    }

    /**
     * Register an event handler
     */
    public on(event: string, handler: WorldEventHandler<any>): void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    /**
     * Remove an event handler
     */
    public off(event: string, handler: WorldEventHandler<any>): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
            if (handlers.size === 0) {
                this.eventHandlers.delete(event);
            }
        }
    }

    /**
     * Emit an event with optional data
     */
    public emit(event: string, data?: any): void {
        // Update event counter
        if (this.eventCounts.has(event as keyof WorldEventMap)) {
            this.eventCounts.set(
                event as keyof WorldEventMap, 
                (this.eventCounts.get(event as keyof WorldEventMap) || 0) + 1
            );
        }

        if (this.batchingEvents) {
            this.queuedEvents.push({ event, data });
        } else {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                for (const handler of handlers) {
                    handler(data);
                }
            }
        }
    }

    /**
     * Remove all event handlers
     */
    public clearEventHandlers(): void {
        this.eventHandlers.clear();
    }

    /**
     * Get all entities in the world
     */
    public getEntities(): Entity[] {
        return Array.from(this.entities.values());
    }

    public getSpatialMapStats(): Map<string, number> {
        const stats = new Map<string, number>();
        for (const [key, entities] of this.spatialMap.entries()) {
            stats.set(key, entities.size);
        }
        return stats;
    }

    public getEventHandlerCount(): number {
        let count = 0;
        for (const handlers of this.eventHandlers.values()) {
            count += handlers.size;
        }
        return count;
    }

    public getEntity(entityId: string): Entity | undefined {
        return this.entities.get(entityId);
    }

    /**
     * Called when a component is added or removed from an entity
     */
    public onEntityModified(entity: Entity, componentType: string): void {
        this.emit('entityModified', {
            entity,
            componentType
        });
    }

    /**
     * Called when an entity's position changes
     */
    private onEntityMoved(entity: Entity, from: Point, to: Point): void {
        // Update FOV map if entity affects visibility
        if (entity.hasComponent('opacity')) {
            this.fovMap.removeBody(from.x, from.y);
            this.fovMap.addBody(to.x, to.y);

            // TODO may need to handle walls here too
        }

        // Update player vision if the moved entity is the player
        // if (entity.hasComponent('player')) {
        //     this.updatePlayerVision();
        // }

        // Emit the event
        this.emit('entityMoved', {
            entity,
            from,
            to
        });
    }

    public startBatch(): void {
        this.batchingEvents = true;
    }

    public endBatch(): void {
        this.batchingEvents = false;
        this.flushEvents();
    }

    private flushEvents(): void {
        for (const { event, data } of this.queuedEvents) {
            const handlers = this.eventHandlers.get(event);
            if (handlers) {
                for (const handler of handlers) {
                    handler(data);
                }
            }
        }
        this.queuedEvents = [];
    }

    public getWorldWidth(): number {
        return this.width;
    }

    public getWorldHeight(): number {
        return this.height;
    }

    // Add method to clear event counts
    public clearEventCounts(): void {
        this.resetEventCounts();
    }

    /**
     * Get all tiles visible to an entity at a given radius
     * @param entity The entity to check vision from
     * @param radius The vision radius (defaults to entity's vision radius if they have one)
     * @returns Set of point keys representing visible tiles
     */
    public getVisibleTilesForEntity(entity: Entity, radius?: number): Set<string> {
        const position = entity.getPosition();
        
        // If no radius specified, try to get it from the entity's vision component
        if (radius === undefined) {
            const vision = entity.getComponent('vision') as VisionComponent;
            if (!vision) {
                throw new Error('Entity has no vision radius specified');
            }
            radius = vision.radius;
        }

        return this.getVisibleTilesFromPosition(position, radius);
    }

    /**
     * Get all tiles visible from a position at a given radius
     */
    public getVisibleTilesFromPosition(position: Point, radius: number): Set<string> {
        const visibleTiles = new Set<string>();
        const radiusInteger = Math.ceil(radius);

        // Update FOV map to ensure it's current
        this.rebuildFOVMap();
        
        // Calculate FOV from the position
        const fov = computeFieldOfView(
            this.fovMap,
            Math.round(position.x),
            Math.round(position.y),
            radiusInteger
        );

        // Check all tiles within the radius
        for (let y = Math.floor(position.y - radiusInteger); y <= Math.ceil(position.y + radiusInteger); y++) {
            for (let x = Math.floor(position.x - radiusInteger); x <= Math.ceil(position.x + radiusInteger); x++) {
                // Skip out of bounds tiles
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                    continue;
                }

                if (fov.getVisible(x, y)) {
                    visibleTiles.add(this.pointToKey({ x, y }));
                }
            }
        }

        return visibleTiles;
    }

    /**
     * Check if one entity can see another
     * @param observer The observing entity
     * @param target The target entity
     * @param radius Optional vision radius (defaults to observer's vision radius)
     * @returns boolean indicating if target is visible to observer
     */
    public canEntitySeeEntity(observer: Entity, target: Entity, radius?: number): boolean {
        const visibleTiles = this.getVisibleTilesForEntity(observer, radius);
        const targetKey = this.pointToKey(target.getPosition());
        return visibleTiles.has(targetKey);
    }

    /**
     * Check if a specific tile is visible to an entity
     * @param entity The observing entity
     * @param position The position to check visibility of
     * @param radius Optional vision radius (defaults to entity's vision radius)
     * @returns boolean indicating if the position is visible
     */
    public canEntitySeePosition(entity: Entity, position: Point, radius?: number): boolean {
        const visibleTiles = this.getVisibleTilesForEntity(entity, radius);
        return visibleTiles.has(this.pointToKey(position));
    }

    // Update the existing updatePlayerVision to use the new methods
    public updatePlayerVision(): void {
        const player = this.getEntitiesWithComponent('player')[0];
        if (!player) return;

        const visibleTiles = this.getVisibleTilesForEntity(player);
        
        // Clear previous visible locations
        this.playerVisibleLocations.clear();

        // Update visible and discovered locations
        for (const key of visibleTiles) {
            this.playerVisibleLocations.set(key, true);
            this.discoveredLocations.add(key);
        }

        // Emit both events for backwards compatibility
        this.emit('fovChanged', {});
        this.emit('playerVisionUpdated', { 
            playerPos: player.getPosition(), 
            visibleLocations: this.playerVisibleLocations 
        });
    }

    // Rebuild FOV map from scratch
    // careful, this is EXPENSIVE. avoid if possible.
    private rebuildFOVMap(): void {
        this.fovMap = new FieldOfViewMap(this.width, this.height);
        
        // Add all opaque entities
        for (const entity of this.entities.values()) {
            if (entity.hasComponent('opacity')) {
                const pos = entity.getPosition();
                this.fovMap.addBody(pos.x, pos.y);
            }
        }

        // Add all walls from entities with wall components
        const wallEntities = this.getEntitiesWithComponent('wall');
        for (const entity of wallEntities) {
            const pos = entity.getPosition();
            const wall = entity.getComponent('wall') as WallComponent;
            
            // Only check north and west walls since those are the only ones we store
            if (wall.north.properties[WallProperty.OPAQUE]) {
                this.fovMap.addWall(pos.x, pos.y, CardinalDirection.NORTH);
            }
            if (wall.west.properties[WallProperty.OPAQUE]) {
                this.fovMap.addWall(pos.x, pos.y, CardinalDirection.WEST);
            }
        }
    }

    // Update FOV for entity changes
    private updateFOVForEntity(entity: Entity, position: Point): void {
        if (this.buildingWorld) return;

        this.fovMap.removeBody(position.x, position.y);
        if (entity.hasComponent('opacity')) {
                this.fovMap.addBody(position.x, position.y);
        }

        if (entity.hasComponent('wall')) {
            const wall = entity.getComponent('wall') as WallComponent;
            
            // Only check north and west walls since those are the only ones we store
            this.fovMap.removeWall(position.x, position.y, CardinalDirection.NORTH);
            if (wall.north.properties[WallProperty.OPAQUE]) {
                this.fovMap.addWall(position.x, position.y, CardinalDirection.NORTH);
            }
            this.fovMap.removeWall(position.x, position.y, CardinalDirection.WEST);
            if (wall.west.properties[WallProperty.OPAQUE]) {
                this.fovMap.addWall(position.x, position.y, CardinalDirection.WEST);
            }
        }

        this.emit('fovChanged');
        this.updatePlayerVision();
    }

    // Add method to force FOV map rebuild if needed
    public rebuildFOV(): void {
        this.rebuildFOVMap();

        this.emit('fovChanged');
    }

    /**
     * Called when a component is added to an entity
     */
    onComponentAdded(entity: Entity, componentType: string): void {
        this.emit('componentAdded', {
            entity,
            componentType
        });
        
        if(componentType === 'opacity') {
            this.updateFOVForEntity(entity, entity.getPosition());
        } else if (componentType === 'wall') {
            this.updateFOVForEntity(entity, entity.getPosition());
        }
    }

    /**
     * Called when a component is removed from an entity
     */
    onComponentRemoved(entity: Entity, componentType: string, component: Component): void {
        this.emit('componentRemoved', {
            entity,
            componentType,
            component
        });

        if(componentType === 'opacity') {
            this.updateFOVForEntity(entity, entity.getPosition());
        } else if (componentType === 'wall') {
            this.updateFOVForEntity(entity, entity.getPosition());
        }
    }

    /**
     * Called when a component is modified on an entity
     */
    onComponentModified(entity: Entity, componentType: string): void {
        this.emit('componentModified', {
            entity,
            componentType
        });

       if (componentType === 'wall') {
            this.updateFOVForEntity(entity, entity.getPosition());
        }
    }

    public getFOVMap(): FieldOfViewMap {
        return this.fovMap;
    }

    public getVisibleTilesInRadius(origin: Point, radius: number): Set<string> {
        const visibleTiles = new Set<string>();
        const radiusInteger = Math.ceil(radius);
        
        // Round the origin for FOV calculation since it only works with integers
        const fov = computeFieldOfView(
            this.fovMap, 
            Math.round(origin.x), 
            Math.round(origin.y), 
            radiusInteger
        );

        // Expand the search area slightly to account for rounding
        for (let y = Math.floor(origin.y - radiusInteger); y <= Math.ceil(origin.y + radiusInteger); y++) {
            for (let x = Math.floor(origin.x - radiusInteger); x <= Math.ceil(origin.x + radiusInteger); x++) {
                if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
                    continue;
                }
                
                if (fov.getVisible(Math.round(x), Math.round(y))) {
                    visibleTiles.add(this.pointToKey({x: Math.round(x), y: Math.round(y)}));
                }
            }
        }

        return visibleTiles;
    }

    /**
     * Set a wall in a specific direction from a position
     * @returns false if the target position would be out of bounds
     */
    public setWall(pos: Point, direction: WallDirection, wall: WallData): boolean {
        let targetPos: Point;
        let wallDirection: WallDirection;

        switch (direction) {
            case WallDirection.NORTH:
                targetPos = pos;
                wallDirection = WallDirection.NORTH;
                break;
            case WallDirection.SOUTH:
                targetPos = { x: pos.x, y: pos.y + 1 };
                wallDirection = WallDirection.NORTH;
                break;
            case WallDirection.WEST:
                targetPos = pos;
                wallDirection = WallDirection.WEST;
                break;
            case WallDirection.EAST:
                targetPos = { x: pos.x + 1, y: pos.y };
                wallDirection = WallDirection.WEST;
                break;
        }

        // Check bounds
        if (targetPos.x < 0 || targetPos.x >= this.width || 
            targetPos.y < 0 || targetPos.y >= this.height) {
            return false;
        }

        let entity = this.getEntitiesWithComponent('wall')
            .find(e => e.getPosition().x === targetPos.x && e.getPosition().y === targetPos.y);

        if (entity) {
            const wallComponent = entity.getComponent('wall') as WallComponent;
            if (wallComponent) {
                // Update existing wall component
                if (wallDirection === WallDirection.NORTH) {
                    wallComponent.north = { ...wall };
                } else {
                    wallComponent.west = { ...wall };
                }
                
                // Update FOV map when walls change
                this.updateFovMapAt(targetPos);

                // Always emit the modification event, don't remove the entity
                this.emit('componentModified', { entity, componentType: 'wall' });
                return true;
            }
        } else if (wall.properties.some(prop => prop)) {
            // Create new entity with wall
            entity = new Entity(targetPos);
            const config: WallConfig = {};
            if (wallDirection === WallDirection.NORTH) {
                config.north = wall;
            } else {
                config.west = wall;
            }
            entity.setComponent(new WallComponent(config));
            
            // Update FOV map for new wall
            this.updateFovMapAt(targetPos);
            
            this.addEntity(entity);
            return true;
        }

        return false;
    }

    private updateFovMapAt(pos: Point): void {
        // First remove any existing walls at this position
        this.fovMap.removeWall(pos.x, pos.y, CardinalDirection.NORTH);
        this.fovMap.removeWall(pos.x, pos.y, CardinalDirection.SOUTH);
        this.fovMap.removeWall(pos.x, pos.y, CardinalDirection.EAST);
        this.fovMap.removeWall(pos.x, pos.y, CardinalDirection.WEST);
        
        // Remove any existing body (for opaque entities)
        this.fovMap.removeBody(pos.x, pos.y);
        
        // Check for opaque entity first
        const opaqueEntity = this.getEntitiesWithComponent('opacity')
            .find(e => e.getPosition().x === pos.x && e.getPosition().y === pos.y);
        if (opaqueEntity) {
            this.fovMap.addBody(pos.x, pos.y);
            return;
        }

        // Handle walls
        const walls = this.getWallsAt(pos);
        for (const [direction, properties] of walls) {
            if (properties.some(p => p)) {
                switch (direction) {
                    case WallDirection.NORTH:
                        this.fovMap.addWall(pos.x, pos.y, CardinalDirection.NORTH);
                        break;
                    case WallDirection.SOUTH:
                        // South wall at (x,y) is actually a north wall at (x,y+1)
                        this.fovMap.addWall(pos.x, pos.y + 1, CardinalDirection.NORTH);
                        break;
                    case WallDirection.WEST:
                        this.fovMap.addWall(pos.x, pos.y, CardinalDirection.WEST);
                        break;
                    case WallDirection.EAST:
                        // East wall at (x,y) is actually a west wall at (x+1,y)
                        this.fovMap.addWall(pos.x + 1, pos.y, CardinalDirection.WEST);
                        break;
                }
            }
        }
    }

    /**
     * Check if there's a wall in a specific direction from a position
     */
    public hasWall(pos: Point, direction: WallDirection): [boolean, boolean, boolean] {
        let targetPos: Point;
        let wallDirection: WallDirection;

        switch (direction) {
            case WallDirection.NORTH:
                targetPos = pos;
                wallDirection = WallDirection.NORTH;
                break;
            case WallDirection.SOUTH:
                targetPos = { x: pos.x, y: pos.y + 1 };
                wallDirection = WallDirection.NORTH;
                break;
            case WallDirection.WEST:
                targetPos = pos;
                wallDirection = WallDirection.WEST;
                break;
            case WallDirection.EAST:
                targetPos = { x: pos.x + 1, y: pos.y };
                wallDirection = WallDirection.WEST;
                break;
        }

        // Check bounds
        if (targetPos.x < 0 || targetPos.x >= this.width || 
            targetPos.y < 0 || targetPos.y >= this.height) {
            return [false, false, false];
        }

        const entity = this.getEntitiesAt(targetPos).find(e => e.hasComponent('wall'));
        const wall = entity?.getComponent('wall') as WallComponent | undefined;
        
        if (wall) {
            return wallDirection === WallDirection.NORTH ? 
                [...wall.north.properties] : 
                [...wall.west.properties];
        }
        
        return [false, false, false];
    }

    /**
     * Get all walls at a position
     */
    public getWallsAt(pos: Point): Array<[WallDirection, [boolean, boolean, boolean]]> {
        const walls: Array<[WallDirection, [boolean, boolean, boolean]]> = [];
        
        for (const direction of [WallDirection.NORTH, WallDirection.SOUTH, WallDirection.EAST, WallDirection.WEST]) {
            const properties = this.hasWall(pos, direction);
            if (properties.some(prop => prop)) {
                walls.push([direction, properties]);
            }
        }
        
        return walls;
    }

    /**
     * Check if movement between two adjacent tiles is possible
     * @returns false if tiles aren't adjacent, if there's an impassable wall between them, or if destination is impassable
     */
    public isPassable(fromX: number, fromY: number, toX: number, toY: number): boolean {
        // Check if tiles are adjacent in cardinal directions
        const dx = toX - fromX;
        const dy = toY - fromY;
        
        // Must be adjacent in exactly one direction
        if (Math.abs(dx) + Math.abs(dy) !== 1) {
            return false;
        }

        // Check walls between tiles
        if (dx === 1) { // Moving east
            const [_, __, impassable] = this.hasWall({ x: fromX, y: fromY }, WallDirection.EAST);
            if (impassable) return false;
        } else if (dx === -1) { // Moving west
            const [_, __, impassable] = this.hasWall({ x: toX, y: toY }, WallDirection.EAST);
            if (impassable) return false;
        } else if (dy === 1) { // Moving south
            const [_, __, impassable] = this.hasWall({ x: fromX, y: fromY }, WallDirection.SOUTH);
            if (impassable) return false;
        } else if (dy === -1) { // Moving north
            const [_, __, impassable] = this.hasWall({ x: toX, y: toY }, WallDirection.SOUTH);
            if (impassable) return false;
        }

        // Check for impassable entities at destination
        const entitiesAtDest = this.getEntitiesAt({ x: toX, y: toY });
        if (entitiesAtDest.some(e => e.hasComponent('impassable'))) {
            return false;
        }

        return true;
    }

    /**
     * @deprecated Use canEntitySeePosition instead
     * Check if a location is currently visible to the player
     */
    public isLocationVisible(position: Point): boolean {
        const key = this.pointToKey(position);
        return Boolean(this.playerVisibleLocations.get(key));
    }

    /**
     * @deprecated Use getVisibleTilesFromPosition or getVisibleTilesForEntity instead
     * Update vision from a position with a given radius
     */
    public updateVision(position: Point, radius: number): void {
        const visibleTiles = this.getVisibleTilesFromPosition(position, radius);
        
        // Clear previous visible locations
        this.playerVisibleLocations.clear();

        // Update visible and discovered locations
        for (const key of visibleTiles) {
            this.playerVisibleLocations.set(key, true);
            this.discoveredLocations.add(key);
        }

        // Emit both events for backwards compatibility
        this.emit('fovChanged', {});
        this.emit('playerVisionUpdated', { 
            playerPos: position, 
            visibleLocations: this.playerVisibleLocations 
        });
    }

    /**
     * @deprecated Use discoveredLocations.has(pointKey) directly
     * Check if a location has been discovered by the player
     */
    public isLocationDiscovered(position: Point): boolean {
        return this.discoveredLocations.has(this.pointToKey(position));
    }
}