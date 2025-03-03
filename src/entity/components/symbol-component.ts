import { Component } from "../component";
import { RegisterComponent } from "../component-registry";

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
    public lockRotationToFacing: boolean = false
  ) {
    super();
  }
}