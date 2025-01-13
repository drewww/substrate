
import { AnimationConfig, AnimationModule, AnimationProperty } from './animation-module';

export interface SymbolProperty extends AnimationProperty {
    symbols: string[];
}

export interface SymbolAnimationConfig extends AnimationConfig {
    symbol?: SymbolProperty;
}

export class SymbolAnimationModule extends AnimationModule<Record<string, string>, SymbolAnimationConfig> {
    protected interpolateValue(config: SymbolAnimationConfig, progress: number): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (config.symbol) {
            const index = Math.floor(progress * (config.symbol.symbols.length - 1));
            result.symbol = config.symbol.symbols[index];
        }
        
        return result;
    }
} 