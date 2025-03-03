import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";
import { Point } from "../../types";

/**
 * Timer component for countdown/timer behavior
 */
@RegisterComponent('timer')
export class TimerComponent extends Component {
  type: 'timer' = 'timer';
  
  constructor(
    public remaining: number = 0,  // seconds remaining
    public total: number = 1,      // total duration
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
    public entityType: string = '',
    public pattern: Point[] = [],  // relative positions to spawn at
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
    public duration: number = 1    // seconds
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