import { ComponentStore } from './component-store';
import { ComponentUnion } from './component';

/**
 * Base entity class that manages components
 */
export class Entity {
  private readonly id: string;
  private store: ComponentStore;

  constructor(id: string) {
    this.id = id;
    this.store = new ComponentStore();
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

  // Optional convenience methods for very common operations
  setPosition(x: number, y: number): this {
    return this.setComponent({ type: 'position', x, y });
  }
} 