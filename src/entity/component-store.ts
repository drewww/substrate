import { ComponentUnion } from './component';
/**
 * Type-safe storage for entity components
 */
export class ComponentStore {
  private components = new Map<string, ComponentUnion>();

  /**
   * Get a component by type
   * @param type The literal type of the component
   * @returns The component if it exists, undefined otherwise
   */
  get<T extends ComponentUnion>(type: T['type']): T | undefined {
    const component = this.components.get(type);
    if (component && component.type === type) {
      return component as T;
    }
    return undefined;
  }

  /**
   * Set a component
   * @param component The component to store
   */
  set<T extends ComponentUnion>(component: T): void {
    this.components.set(component.type, component);
  }

  /**
   * Remove a component by type
   * @param type The literal type of the component to remove
   * @returns true if the component was removed, false if it didn't exist
   */
  remove(type: ComponentUnion['type']): boolean {
    return this.components.delete(type);
  }

  /**
   * Check if a component type exists
   * @param type The literal type of the component
   */
  has(type: ComponentUnion['type']): boolean {
    return this.components.has(type);
  }

  /**
   * Get all component types currently stored
   */
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }

  /**
   * Get all components currently stored
   */
  values(): ComponentUnion[] {
    return Array.from(this.components.values());
  }

  /**
   * Get the number of components stored
   */
  size(): number {
    return this.components.size;
  }
} 