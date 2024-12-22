import { isTransient, transient } from "../decorators/transient";
import { Direction, Point } from "../types";
import { ComponentRegistry, RegisterComponent } from './component-registry';

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

  toJSON(): object {
    const json: any = {};
    for (const key of Object.keys(this)) {
      // Skip the type property as it's handled separately
      if (key === 'type') continue;
      
      // Use the isTransient helper to check if property should be excluded
      if (isTransient(this, key)) continue;
      
      const value = (this as any)[key];
      if (value !== undefined) {
        json[key] = value;
      }
    }
    return {
      type: this.type,
      ...json
    };
  }

  static fromJSON(data: any): Component {
    return ComponentRegistry.fromJSON(data);
  }
}




/**
 * Symbol component for entities that have a symbol
 */
@RegisterComponent('symbol')
export class SymbolComponent extends Component {
  type: 'symbol' = 'symbol';
  
  constructor(
    public char: string,
    public foreground: string = '#FFFFFFFF',
    public background: string = '#00000000',
    public zIndex: number = 1
  ) {
    super();
  }

  static fromJSON(data: any): SymbolComponent {
    return new SymbolComponent(
      data.char,
      data.foreground,
      data.background,
      data.zIndex
    );
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
  