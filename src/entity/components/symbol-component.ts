import { Component } from "../component";
import { RegisterComponent } from "../component-registry";
import { BlendMode } from "../../display/types";

export interface SymbolAnimationConfig {
  symbols: string[];
  duration: number;
  loop?: boolean;
  running?: boolean;
}

export interface ColorAnimationConfig {
  start: string;
  end: string;
  duration: number;
  reverse?: boolean;
  easing?: (t: number) => number;
  loop?: boolean;
}

export interface ValueAnimationConfig {
  start: number;
  end: number;
  duration: number;
  reverse?: boolean;
  easing?: (t: number) => number;
  loop?: boolean;
}

export interface SymbolConfig {
  char: string;
  foreground?: string;
  background?: string;
  zIndex?: number;
  alwaysRenderIfExplored?: boolean;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
  lockRotationToFacing?: boolean;
  blendMode?: string;
  animations?: {
    symbol?: SymbolAnimationConfig;
    color?: {
      fg?: ColorAnimationConfig;
      bg?: ColorAnimationConfig;
    };
    offset?: {
      x?: ValueAnimationConfig;
      y?: ValueAnimationConfig;
    };
    scale?: {
      x?: ValueAnimationConfig;
      y?: ValueAnimationConfig;
    };
    rotation?: ValueAnimationConfig;
  };
}

/**
 * Symbol component for entities that have a symbol
 */
@RegisterComponent('symbol')
export class SymbolComponent extends Component {
  readonly type = 'symbol';
  
  constructor(
    public char: string = '?',
    public foreground: string = '#FFFFFFFF',
    public background: string = '#00000000',
    public zIndex: number = 1,
    public alwaysRenderIfExplored: boolean = false,
    public rotation: number = 0,
    public offsetSymbolX: number = 0,
    public offsetSymbolY: number = 0,
    public scaleSymbolX: number = 1.0,
    public scaleSymbolY: number = 1.0,
    public fontWeight: string = 'normal',
    public fontStyle: string = 'normal',
    public fontFamily: string = 'monospace',
    public lockRotationToFacing: boolean = false,
    public blendMode: string = BlendMode.SourceOver,
    public animations?: SymbolConfig['animations']
  ) {
    super();
  }
}