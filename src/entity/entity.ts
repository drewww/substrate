import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import { ComponentStore } from './component-store';
import { ComponentUnion } from './component';
import { REQUIRED_COMPONENTS } from './decorators';

/**
 * Base entity class that manages components
 */
export class Entity {
  private readonly id: string;
  private store: ComponentStore;

  constructor(id?: string) {
    this.id = id ?? Entity.generateId();
    this.store = new ComponentStore();
  }

  /**
   * Generate a unique entity ID using UUID v4
   */
  private static generateId(): string {
    return uuidv4();
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
  getComponent<T extends ComponentUnion>(type: T['type']): T | undefined {
    return this.store.get(type);
  }

  /**
   * Set a component
   */
  setComponent<T extends ComponentUnion>(component: T): this {
    this.store.set(component);
    return this;
  }

  /**
   * Check if entity has a specific component
   */
  hasComponent<T extends ComponentUnion>(type: T['type']): boolean {
    return this.store.has(type);
  }

  /**
   * Remove a component from the entity
   */
  removeComponent<T extends ComponentUnion>(type: T['type']): boolean {
    return this.store.remove(type);
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

  // Optional convenience methods for very common operations
  setPosition(x: number, y: number): this {
    return this.setComponent({ type: 'position', x, y });
  }
} 