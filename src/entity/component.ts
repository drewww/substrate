import { isTransient, transient } from "../decorators/transient";
import { Point } from "../types";
import { ComponentRegistry } from './component-registry';

/**
 * Base type for all components
 */
export abstract class Component {
  abstract readonly type: string;

  @transient
  modified?: boolean;

  // Add a decorator or method to mark properties that should trigger modification
  protected markModified() {
    if (this.modified !== undefined) {
      this.modified = true;
    }
  }

  // Helper to create property descriptors that auto-mark as modified
  protected createModifiedProperty<T>(privateKey: string) {
    return {
      get(this: Component): T {
        return (this as any)[privateKey];
      },
      set(this: Component, value: T) {
        (this as any)[privateKey] = value;
        this.modified = true;
      },
      enumerable: true,
      configurable: true
    };
  }

  serialize(): Record<string, any> {
    const json: Record<string, any> = {
        type: this.type
    };
    
    for (const key of Object.keys(this)) {
        // Skip type and modified as they're handled separately
        if (key === 'type' || key === 'modified') continue;
        
        // Skip transient properties
        if (isTransient(this, key)) continue;
        
        const value = (this as any)[key];
        if (value !== undefined) {
            json[key] = value;
        }
    }
    return json;
  }

  deserialize(data: Record<string, any>): void {
    for (const [key, value] of Object.entries(data)) {
      if (key !== 'type' && !isTransient(this, key)) {
        (this as any)[key] = value;
      }
    }
  }

  static fromJSON(data: any): Component {
    return ComponentRegistry.fromJSON(data);
  }
}

/**
 * Serialized entity data structure
 */
export interface SerializedEntity {
  id: string;
  position: Point;
  components: Component[];
  tags?: string[];
}
  