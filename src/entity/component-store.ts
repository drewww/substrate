import { Component } from './component';
/**
 * Type-safe storage for entity components
 */
export class ComponentStore {
  private components = new Map<string, Component>();

  /**
   * Get a component by type
   * @param type The literal type of the component
   * @returns The component if it exists, undefined otherwise
   */
  get(type: string): Component | undefined {
    return this.components.get(type);
  }

  /**
   * Set a component
   * @param type The type key for the component
   * @param component The component to store
   */
  set(component: Component): void {
    this.components.set(component.type, component);
  }

  /**
   * Remove a component by type
   * @param type The literal type of the component to remove
   * @returns the component that was removed, or undefined if it didn't exist
   */
  remove(type: string): Component | undefined {
    const component = this.components.get(type);
    if (component) {
      this.components.delete(type);
    }
    return component;
  }

  /**
   * Check if a component type exists
   * @param type The literal type of the component
   */
  has(type: string): boolean {
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
  values(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Get the number of components stored
   */
  size(): number {
    return this.components.size;
  }
} 