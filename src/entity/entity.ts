import 'reflect-metadata';
import { ComponentStore } from './component-store';
import { SerializedEntity } from './component';
import { REQUIRED_COMPONENTS } from './decorators';
import { Point } from '../types';
import { isTransient } from '../decorators/transient';
import { Component } from './component';
import { World } from '../world/world';
import { logger } from '../util/logger';
import { ComponentRegistry } from './component-registry';

/**
 * Base entity class that manages components
 * 
 * Events:
 * - entityModified: Fired when components are added/removed
 * - entityMoved: Fired when position is updated
 * - componentModified: Fired when component values change
 */
export class Entity {
  private static nextId = 0;
  private readonly id: string;
  protected store: ComponentStore;
  private changedComponents: Set<string> = new Set();
  private tags: Set<string> = new Set();
  private _position: Point;
  private positionChanged: boolean = false;
  protected world?: World;

  constructor(position: Point, id?: string) {
    this.id = id ?? Entity.generateId();
    this._position = { ...position }; // Copy to prevent mutation
    this.store = new ComponentStore();
  }

  /**
   * Generate a sequential entity ID
   */
  private static generateId(): string {
    return `e${this.nextId++}`;
  }

  /**
   * Get the entity's unique identifier
   */
  getId(): string {
    return this.id;
  }

  /**
   * Get a component by type
   */
  getComponent(type: string): Component | undefined {
    return this.store.get(type);
  }

  /**
   * Set a component on the entity (adds or updates)
   */
  setComponent(component: Component): this {
    const copy = Object.create(
        Object.getPrototypeOf(component),
        Object.getOwnPropertyDescriptors(component)
    );
    
    const isUpdate = this.store.has(component.type);
    this.store.set(copy);
    this.changedComponents.add(component.type);

    if (this.world) {
        if (isUpdate) {
            this.world.onComponentModified(this, component.type);
        } else {
            this.world.onComponentAdded(this, component.type);
        }
    }
    
    return this;
  }

  /**
   * Check if entity has a specific component
   */
  hasComponent(type: string): boolean {
    return this.store.has(type);
  }

  /**
   * Remove a component from the entity
   */
  removeComponent(type: string): Component | undefined {
    const removed = this.store.remove(type);
    if (removed && this.world) {
        this.world.onComponentRemoved(this, type, removed);
    }
    return removed;
  }

  /**
   * Validates that all required components are present
   * @throws Error if any required component is missing
   */
  protected validateRequiredComponents(): void {
    const required = Reflect.getMetadata(REQUIRED_COMPONENTS, this.constructor) || [];
    for (const type of required) {
      if (!this.hasComponent(type)) {
        throw new Error(`Entity ${this.id} is missing required component: ${type}`);
      }
    }
  }

  /**
   * Validates the entity's current state
   * @throws Error if validation fails
   */
  public validate(): void {
    // Required components
    this.validateRequiredComponents();
    
    // Future validation types could go here:
    // - Component dependencies
    // - Component data validation
    // - Entity state validation
    // - etc.
  }

  /**
   * Get the entity's position
   */
  getPosition(): Point {
    return { ...this._position }; // Return copy to prevent direct mutation
  }

  /**
   * Set the entity's position (triggers entityMoved event)
   */
  setPosition(x: number, y: number): this {
    this._position = { x, y };
    this.positionChanged = true;
    
    return this;
  }

  /**
   * Check if position has changed since last update
   */
  hasPositionChanged(): boolean {
    return this.positionChanged;
  }

  /**
   * Clear position changed flag (typically called at end of frame)
   */
  clearPositionChanged(): void {
    this.positionChanged = false;
  }

  /**
   * Clear all change flags
   */
  clearChanges(): void {
    this.positionChanged = false;
    this.changedComponents.clear();
  }

  /**
   * Serialize entity to plain object
   */
  serialize(): SerializedEntity {
    return {
      id: this.id,
      position: this._position,
      components: Array.from(this.store.values()).map(component => 
        component.serialize()
      ),
      tags: Array.from(this.tags)
    };
  }

  /**
   * Create an entity from serialized data
   */
  static deserialize(data: SerializedEntity): Entity {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid serialized data: must be an object');
    }
    
    // Update nextId based on loaded entity ID
    if (data.id && typeof data.id === 'string') {
        const match = data.id.match(/e(\d+)/);
        if (match) {
            const idNum = parseInt(match[1], 10);
            Entity.nextId = Math.max(Entity.nextId, idNum + 1);
        }
    }

    if (!data.id || typeof data.id !== 'string') {
      data.id = Entity.generateId();
      // throw new Error('Invalid serialized data: missing or invalid id');
    }
    if (!data.position || typeof data.position.x !== 'number' || typeof data.position.y !== 'number') {
      throw new Error('Invalid serialized data: missing or invalid position');
    }

    const entity = new Entity(data.position, data.id);

    if (Array.isArray(data.components)) {
      for (const component of data.components) {
        if (!component || typeof component !== 'object' || !('type' in component)) {
          throw new Error('Invalid serialized data: invalid component format');
        }
        entity.setComponent(ComponentRegistry.fromJSON(component));
      }
    }

    if (Array.isArray(data.tags)) {
      entity.addTags(data.tags);
    }

    return entity;
  }

  /**
   * Check if entity has all of the specified components
   */
  hasAllComponents(types: string[]): boolean {
    return types.every(type => this.hasComponent(type));
  }

  /**
   * Check if entity has any of the specified components
   */
  hasAnyComponents(types: string[]): boolean {
    return types.some(type => this.hasComponent(type));
  }

  /**
   * Get all component types on this entity
   */
  getComponentTypes(): string[] {
    return this.getComponents().map(c => c.type);
  }

  /**
   * Check if entity lacks all of the specified components
   */
  doesNotHaveComponents(types: string[]): boolean {
    return types.every(type => !this.hasComponent(type));
  }

  /**
   * Check if a specific component has been modified
   */
  hasComponentChanged(type: string): boolean {
    return this.changedComponents.has(type);
  }

  /**
   * Get all component types that have been modified
   */
  getChangedComponents(): string[] {
    return Array.from(this.changedComponents);
  }

  /**
   * Check if any components have been modified
   */
  hasChanges(): boolean {
    return this.changedComponents.size > 0;
  }

  /**
   * Add a tag to the entity
   */
  addTag(tag: string): this {
    this.tags.add(tag);
    return this;
  }

  /**
   * Remove a tag from the entity
   */
  removeTag(tag: string): boolean {
    return this.tags.delete(tag);
  }

  /**
   * Check if entity has a specific tag
   */
  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  /**
   * Get all tags on this entity
   */
  getTags(): string[] {
    return Array.from(this.tags);
  }

  /**
   * Add multiple tags at once
   */
  addTags(tags: string[]): this {
    tags.forEach(tag => this.tags.add(tag));
    return this;
  }

  /**
   * Remove all tags from the entity
   */
  clearTags(): void {
    this.tags.clear();
  }

  /**
   * Get all components on this entity
   */
  getComponents(): Component[] {
    return this.store.values().map(component => {
      const copy = Object.create(
        Object.getPrototypeOf(component),
        Object.getOwnPropertyDescriptors(component)
      );
      
      for (const key in copy) {
        if (isTransient(component, key)) {
          delete (copy as any)[key];
        }
      }
      
      return copy;
    });
  }

  /**
   * Get the number of components on this entity
   */
  getComponentCount(): number {
    return this.store.size();
  }

  /**
   * Set the world reference
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Mark a component as modified (triggers componentModified event)
   * Use this when updating values within a component
   */
  markComponentModified(type: string): void {
    const component = this.getComponent(type);
    if (component) {
      this.changedComponents.add(type);
      
      if (this.world) {
        this.world.onComponentModified(this, type);
      }
    }
  }

  /**
   * Clone the entity
   */
  clone(): Entity {
    const serialized = this.serialize();
    // Remove the id so deserialize will generate a new one
    delete serialized.id;

    return Entity.deserialize(serialized);
  }
} 