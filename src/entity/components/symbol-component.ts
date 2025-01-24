import { Component } from "../component";
import { RegisterComponent } from "../component-registry";

export interface SymbolConfig {
  char: string;
  foreground?: string;
  background?: string;
  zIndex?: number;
  alwaysRenderIfExplored?: boolean;
}

/**
 * Symbol component for entities that have a symbol
 */
@RegisterComponent('symbol')
export class SymbolComponent extends Component {
  readonly type = 'symbol';
  
  constructor(
    public char: string,
    public foreground: string = '#FFFFFFFF',
    public background: string = '#00000000',
    public zIndex: number = 1,
    public alwaysRenderIfExplored: boolean = false
  ) {
    super();
  }

  static fromJSON(data: any): SymbolComponent {
    return new SymbolComponent(
      data.char,
      data.foreground,
      data.background,
      data.zIndex,
      data.alwaysRenderIfExplored
    );
  }

  // Helper method to create from config object
  static fromConfig(config: SymbolConfig): SymbolComponent {
    return new SymbolComponent(
      config.char,
      config.foreground ?? '#FFFFFFFF',
      config.background ?? '#00000000',
      config.zIndex ?? 1,
      config.alwaysRenderIfExplored ?? true
    );
  }
}