import { isTransient, transient } from "../decorators/transient";
import { Direction, Point } from "../types";

/**
 * Base type for all components
 */
export abstract class Component {
  abstract readonly type: string;

  @transient
  modified?: boolean;

  toJSON(): object {
    const json: any = {};
    for (const key of Object.keys(this)) {
      // Use the isTransient helper to check if property should be excluded
      if (isTransient(this, key)) continue;
      
      const value = (this as any)[key];
      if (value !== undefined) {
        json[key] = value;
      }
    }
    return json;
  }

  static fromJSON(data: any): Component {
    const ComponentClass = COMPONENT_TYPES[data.type];
    if (!ComponentClass) {
      throw new Error(`Unknown component type: ${data.type}`);
    }
    return ComponentClass.fromJSON(data);
  }
}

/**
 * Position component for entities that exist in 2D space
 */
export class PositionComponent extends Component {
  type: 'position' = 'position';
  x: number;
  y: number;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
  }

  static fromJSON(data: any): PositionComponent {
    return new PositionComponent(data.x, data.y);
  }
}

/**
 * Health component for entities that can take damage
 */
export class HealthComponent extends Component {
  type: 'health' = 'health';
  current: number;
  max: number;

  constructor(current: number, max: number) {
    super();
    this.current = current;
    this.max = max;
  }

  static fromJSON(data: any): HealthComponent {
    return new HealthComponent(data.current, data.max);
  }
}

/**
 * Facing component for entities that have a direction
 */
export class FacingComponent extends Component {
  type: 'facing' = 'facing';
  direction: Direction;

  constructor(direction: Direction) {
    super();
    this.direction = direction;
  }

  static fromJSON(data: any): FacingComponent {
    return new FacingComponent(data.direction);
  }
}

/**
 * Registry of all component types
 * Update this when adding new components
 */
export const COMPONENT_TYPES: Record<string, {
  fromJSON(data: any): Component;
}> = {
  'position': PositionComponent,
  'health': HealthComponent,
  'facing': FacingComponent,
};

/**
 * Serialized entity data structure
 */
export interface SerializedEntity {
  id: string;
  position: Point;
  components: Component[];
  tags?: string[];
}
  