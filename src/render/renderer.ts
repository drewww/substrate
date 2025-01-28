import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';

export interface Renderer {
    update(timestamp: number): void;
    handleEntityAdded(entity: Entity, tileId: string): void;
    handleEntityModified(entity: Entity, componentType: string): void;
    handleComponentModified(entity: Entity, componentType: string): void;
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void;
    handleEntityRemoved(entity: Entity): void;
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean;
} 