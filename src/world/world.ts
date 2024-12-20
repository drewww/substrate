import { ComponentUnion } from '../entity/component';
import { Entity } from '../entity/entity';
import { Point } from '../types';

export class World {
    private entities: Map<string, Entity> = new Map();
    private spatialMap: Map<string, Set<string>> = new Map();
    
    constructor(private readonly width: number, private readonly height: number) {}

    private pointToKey({ x, y }: Point): string {
        return `${x},${y}`;
    }

    /**
     * Add an entity to the world at the specified position
     */
    public addEntity(entity: Entity, position: Point): void {
        if (position.x < 0 || position.x >= this.width || 
            position.y < 0 || position.y >= this.height) {
            throw new Error(`Position ${position.x},${position.y} is out of bounds`);
        }

        const entityId = entity.getId();
        this.entities.set(entityId, entity);

        const key = this.pointToKey(position);
        let entitiesAtPosition = this.spatialMap.get(key);
        if (!entitiesAtPosition) {
            entitiesAtPosition = new Set();
            this.spatialMap.set(key, entitiesAtPosition);
        }
        entitiesAtPosition.add(entityId);

        entity.setPosition(position.x, position.y);
    }

    public moveEntity(entityId: string, newPosition: Point): void {
        if (newPosition.x < 0 || newPosition.x >= this.width || 
            newPosition.y < 0 || newPosition.y >= this.height) {
            throw new Error(`Position ${newPosition.x},${newPosition.y} is out of bounds`);
        }

        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }

        // Remove from old position
        const oldPosition = entity.getPosition();
        const oldKey = this.pointToKey(oldPosition);
        const oldSet = this.spatialMap.get(oldKey);
        oldSet?.delete(entityId);
        if (oldSet?.size === 0) {
            this.spatialMap.delete(oldKey);
        }

        // Add to new position
        const newKey = this.pointToKey(newPosition);
        let newSet = this.spatialMap.get(newKey);
        if (!newSet) {
            newSet = new Set();
            this.spatialMap.set(newKey, newSet);
        }
        newSet.add(entityId);

        entity.setPosition(newPosition.x, newPosition.y);
    }

    public removeEntity(entityId: string): void {
        const entity = this.entities.get(entityId);
        if (!entity) return;

        const position = entity.getPosition();
        const key = this.pointToKey(position);
        const entitiesAtPosition = this.spatialMap.get(key);
        entitiesAtPosition?.delete(entityId);
        if (entitiesAtPosition?.size === 0) {
            this.spatialMap.delete(key);
        }

        this.entities.delete(entityId);
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
    public getEntitiesWithComponent<T extends ComponentUnion>(componentType: T['type']): Entity[] {
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
    public getEntitiesWithComponents<T extends ComponentUnion>(componentTypes: T['type'][]): Entity[] {
        return Array.from(this.entities.values())
            .filter(entity => componentTypes.every(type => entity.hasComponent(type)));
    }

    /**
     * Add multiple entities to the world at once
     * @throws Error if any position is out of bounds
     */
    public addEntities(entities: Array<{ entity: Entity, position: Point }>): void {
        // Validate all positions first to ensure atomicity
        for (const { position } of entities) {
            if (position.x < 0 || position.x >= this.width || 
                position.y < 0 || position.y >= this.height) {
                throw new Error(`Position ${position.x},${position.y} is out of bounds`);
            }
        }

        // Add all entities
        for (const { entity, position } of entities) {
            const entityId = entity.getId();
            this.entities.set(entityId, entity);

            const key = this.pointToKey(position);
            let entitiesAtPosition = this.spatialMap.get(key);
            if (!entitiesAtPosition) {
                entitiesAtPosition = new Set();
                this.spatialMap.set(key, entitiesAtPosition);
            }
            entitiesAtPosition.add(entityId);

            entity.setPosition(position.x, position.y);
        }
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
} 