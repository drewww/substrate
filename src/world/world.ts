import { SerializedEntity } from '../entity/component';
import { Entity } from '../entity/entity';
import { Point } from '../types';
import { Component } from '../entity/component';
import { logger } from '../util/logger';
import { ComponentRegistry } from '../entity/component-registry';

interface SerializedWorld {
    width: number;
    height: number;
    entities: SerializedEntity[];
}

interface UpdatableComponent {
    update(deltaTime: number): void;
    value?: number;
}

export type WorldEventMap = {
    'entityAdded': { entity: Entity };
    'entityRemoved': { entity: Entity, position: Point };
    'entityMoved': { entity: Entity, from: Point, to: Point };
    'entityModified': { entity: Entity, componentType: string };
    'componentModified': { entity: Entity, componentType: string };
}

type WorldEventHandler<T extends keyof WorldEventMap> = (data: WorldEventMap[T]) => void;

export class World {
    private entities: Map<string, Entity> = new Map();
    private spatialMap: Map<string, Set<string>> = new Map();
    private eventHandlers = new Map<string, Set<WorldEventHandler<any>>>();
    private queuedEvents: Array<{ event: string, data: any }> = [];
    private batchingEvents = false;
    
    // Add event counters
    private eventCounts = new Map<keyof WorldEventMap, number>();
    
    constructor(private readonly width: number, private readonly height: number) {
        // Initialize event counters
        this.resetEventCounts();
    }

    private resetEventCounts(): void {
        this.eventCounts.clear();
        this.eventCounts.set('entityAdded', 0);
        this.eventCounts.set('entityRemoved', 0);
        this.eventCounts.set('entityMoved', 0);
        this.eventCounts.set('entityModified', 0);
        this.eventCounts.set('componentModified', 0);
    }

    public getEventCounts(): Map<keyof WorldEventMap, number> {
        return new Map(this.eventCounts);
    }

    private pointToKey({ x, y }: Point): string {
        return `${x},${y}`;
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

        // Let the entity update its position - it will call back to onEntityMoved
        entity.setPosition(newPosition.x, newPosition.y);
        return true;
    }

    public removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) {
            logger.warn(`Attempted to remove non-existent entity: ${entityId}`);
            return;
        }

        const position = entity.getPosition();
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

    public update(deltaTime: number): void {
        for (const entity of this.entities.values()) {
            const componentTypes = entity.getComponentTypes();
            
            for (const type of componentTypes) {
                const component = entity.getComponent(type);
                if (!component) continue;

                const isUpdatable = (comp: any): comp is (Component & UpdatableComponent) => {
                    return typeof comp.update === 'function';
                };

                if (isUpdatable(component)) {
                    component.update(deltaTime);
                    component.modified = true;
                    entity.markComponentModified(type);
                    this.emit('componentModified', {
                        entity,
                        componentType: type
                    });
                }
            }
        }
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
     * Called when a component's values are modified
     */
    public onComponentModified(entity: Entity, componentType: string): void {
        this.emit('componentModified', {
            entity,
            componentType
        });
    }

    /**
     * Called when an entity's position changes
     */
    public onEntityMoved(entity: Entity, from: Point, to: Point): void {
        // Update spatial map
        const oldKey = this.pointToKey(from);
        const oldSet = this.spatialMap.get(oldKey);
        oldSet?.delete(entity.getId());
        if (oldSet?.size === 0) {
            this.spatialMap.delete(oldKey);
        }

        const newKey = this.pointToKey(to);
        let newSet = this.spatialMap.get(newKey);
        if (!newSet) {
            newSet = new Set();
            this.spatialMap.set(newKey, newSet);
        }
        newSet.add(entity.getId());

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
} 