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
  // protected createModifiedProperty<T>(privateKey: string) {
  //   return {
  //     get(this: Component): T {
  //       return (this as any)[privateKey];
  //     },
  //     set(this: Component, value: T) {
  //       (this as any)[privateKey] = value;
  //       this.modified = true;
  //     },
  //     enumerable: true,
  //     configurable: true
  //   };
  // }

  serialize(): SerializedComponent {
    const json: SerializedComponent = {
        type: this.type
    };
    
    for (const key of Object.keys(this)) {
        // Skip type and modified
        if (key === 'type' || key === 'modified') continue;
        
        // Skip transient properties
        if (isTransient(this, key)) continue;
        
        // For private fields, strip the underscore and use that as the key
        const publicKey = key.startsWith('_') ? key.slice(1) : key;
        const value = (this as any)[key];
        
        if (value !== undefined) {
            json[publicKey] = value;
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

  // static fromJSON(data: any): Component {
  //   return ComponentRegistry.fromJSON(data);
  // }

  /**
   * Creates a deep copy of this component.
   * Components with mutable state should override this method.
   */
  public clone(): Component {
    const copy = new (this.constructor as any)();
    copy.deserialize(this.serialize());
    return copy;
  }
}

/**
 * Serialized entity data structure
 */
export interface SerializedComponent {
    type: string;
    [key: string]: any;
}

export interface SerializedEntity {
    id?: string;
    position: Point;
    components: SerializedComponent[];
    tags?: string[];
}
  