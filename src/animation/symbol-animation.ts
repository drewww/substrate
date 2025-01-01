import { logger } from '../util/logger';
import { AnimationConfig, AnimationModule, AnimationProperty } from './animation-module';

export interface SymbolProperty extends AnimationProperty {
    symbols: string[];
}

export interface SymbolAnimationConfig extends AnimationConfig {
    symbols?: SymbolProperty;
}

export class SymbolAnimationModule extends AnimationModule<Record<string, string>, SymbolAnimationConfig> {
    protected interpolateValue(config: SymbolAnimationConfig, progress: number): Record<string, string> {
        const result: Record<string, string> = {};
        
        if (config.symbols) {
            const index = Math.floor(progress * (config.symbols.symbols.length - 1));
            result.symbol = config.symbols.symbols[index];
        }
        
        return result;
    }
} 