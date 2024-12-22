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
 * Position component for entities that exist in 2D space
 */
@RegisterComponent('position')
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
@RegisterComponent('health')
export class HealthComponent extends Component {
  readonly type = 'health';
  private _current: number;
  private _max: number;

  constructor(current: number, max: number) {
    super();
    this._current = current;
    this._max = max;

    // Automatically create getters/setters with modification tracking
    Object.defineProperty(this, 'current', this.createModifiedProperty<number>('_current'));
    Object.defineProperty(this, 'max', this.createModifiedProperty<number>('_max'));
  }

  static fromJSON(data: any): HealthComponent {
    return new HealthComponent(data.current, data.max);
  }
}

/**
 * Facing component for entities that have a direction
 */
@RegisterComponent('facing')
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
 * Timer component for countdown/timer behavior
 */
@RegisterComponent('timer')
export class TimerComponent extends Component {
  type: 'timer' = 'timer';
  
  constructor(
    public remaining: number,  // seconds remaining
    public total: number,      // total duration
    public onComplete?: string // event to emit when done
  ) {
    super();
  }

  static fromJSON(data: any): TimerComponent {
    return new TimerComponent(data.remaining, data.total, data.onComplete);
  }
}

/**
 * Spawner component for entities that create other entities
 */
@RegisterComponent('spawner')
export class SpawnerComponent extends Component {
  type: 'spawner' = 'spawner';
  
  constructor(
    public entityType: string,
    public pattern: Point[],  // relative positions to spawn at
    public config: any = {}   // additional spawn configuration
  ) {
    super();
  }

  static fromJSON(data: any): SpawnerComponent {
    return new SpawnerComponent(data.entityType, data.pattern, data.config);
  }
}

/**
 * Fade component for visual effects that fade
 */
@RegisterComponent('fade')
export class FadeComponent extends Component {
  type: 'fade' = 'fade';
  
  constructor(
    public startOpacity: number = 1.0,
    public endOpacity: number = 0.0,
    public duration: number    // seconds
  ) {
    super();
  }

  static fromJSON(data: any): FadeComponent {
    return new FadeComponent(data.startOpacity, data.endOpacity, data.duration);
  }
}

/**
 * Smoke bomb component for the smoke bomb behavior
 */
@RegisterComponent('smokeBomb')
export class SmokeBombComponent extends Component {
  type: 'smokeBomb' = 'smokeBomb';
  
  constructor(
    public radius: number = 1,
    public color: string = '#FFFFFF'
  ) {
    super();
  }

  static fromJSON(data: any): SmokeBombComponent {
    return new SmokeBombComponent(data.radius, data.color);
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
  