import { transient } from "../decorators/transient";
import { Direction, Point } from "../types";

/**
 * Base type for all components
 */
export abstract class Component {
  readonly type!: string;

  @transient
  modified?: boolean;
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
}

/**
 * Serialized entity data structure
 */
export interface SerializedEntity {
  id: string;
  position: Point;
  components: ComponentUnion[];
  tags?: string[];
}

/**
 * Union of all possible component types
 * Update this when adding new components
 */
export type ComponentUnion = PositionComponent | HealthComponent | FacingComponent;
  