import { Entity } from '../entity/entity';
import { Point } from '../types';
import { PositionComponent } from '../entity/component';

export class World {
    private entities: Map<string, Entity> = new Map();
    private spatialMap: Map<string, Set<string>> = new Map();
    
    constructor(private readonly width: number, private readonly height: number) {}

    private pointToKey({ x, y }: Point): string {
        return `${x},${y}`;
    }

    /**
     * Add an entity to the world. All entities must have a position.
     */
    public addEntity(entity: Entity, position: Point): void {
        if (position.x < 0 || position.x >= this.width || 
            position.y < 0 || position.y >= this.height) {
            throw new Error(`Position ${position.x},${position.y} is out of bounds`);
        }

        const entityId = entity.getId();
        
        // Enforce position requirement
        if (!entity.hasComponent('position')) {
            throw new Error('All entities in the world must have a position component');
        }

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
        const entity = this.entities.get(entityId);
        if (!entity) {
            throw new Error(`Entity ${entityId} not found`);
        }

        const posComponent = entity.getComponent<PositionComponent>('position');
        if (!posComponent) {
            throw new Error(`Entity ${entityId} has no position component`);
        }

        // Remove from old position
        const oldKey = this.pointToKey({ x: posComponent.x, y: posComponent.y });
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

        const posComponent = entity.getComponent<PositionComponent>('position');
        if (posComponent) {
            const key = this.pointToKey({ x: posComponent.x, y: posComponent.y });
            const entitiesAtPosition = this.spatialMap.get(key);
            entitiesAtPosition?.delete(entityId);
            if (entitiesAtPosition?.size === 0) {
                this.spatialMap.delete(key);
            }
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
} 