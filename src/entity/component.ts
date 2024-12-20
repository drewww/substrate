import { Direction, Point } from "../types";

/**
 * Base type for all components
 */
export interface Component {
  readonly type: string;
  modified?: boolean;
}

/**
 * Position component for entities that exist in 2D space
 */
export interface PositionComponent extends Component {
  type: 'position';
  x: number;
  y: number;
}

/**
 * Health component for entities that can take damage
 */
export interface HealthComponent extends Component {
  type: 'health';
  current: number;
  max: number;
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

// Add more component interfaces here as needed

/**
 * Union of all possible component types
 * Update this when adding new components
 */
export type ComponentUnion = PositionComponent | HealthComponent | FacingComponent;

// Add this interface
export interface FacingComponent extends Component {
    type: 'facing';
    direction: Direction;
}
  