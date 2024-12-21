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
 * Timer component for countdown/timer behavior
 */
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
 * Registry of all component types
 * Update this when adding new components
 */
export const COMPONENT_TYPES: Record<string, {
  fromJSON(data: any): Component;
}> = {
  'position': PositionComponent,
  'health': HealthComponent,
  'facing': FacingComponent,
  'timer': TimerComponent,
  'spawner': SpawnerComponent,
  'fade': FadeComponent,
  'smokeBomb': SmokeBombComponent,
  'symbol': SymbolComponent
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
  