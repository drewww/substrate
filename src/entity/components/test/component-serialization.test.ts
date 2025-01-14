import { ComponentRegistry } from '../../component-registry';
import { LightEmitterComponent, LightEmitterConfig } from '../light-emitter-component';
import { SymbolComponent } from '../symbol-component';
import { Component } from '../../component';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Component Registry', () => {
    it('should have registered components', () => {
        const components = ComponentRegistry.getRegisteredComponents();
        console.log('Registered components:', Array.from(components.entries()));
        expect(components.size).toBeGreaterThan(0);
    });

    it('should include LightEmitterComponent', () => {
        const components = ComponentRegistry.getRegisteredComponents();
        expect(components.get('lightEmitter')).toBe(LightEmitterComponent);
    });

    it('should include SymbolComponent', () => {
        const components = ComponentRegistry.getRegisteredComponents();
        expect(components.get('symbol')).toBe(SymbolComponent);
    });
});

describe('Component Serialization Tests', () => {
    describe('LightEmitterComponent', () => {
        it('should serialize and deserialize correctly', () => {
            const config: LightEmitterConfig = {
                radius: 5,
                intensity: 1.0,
                color: '#FFFFFF',
                distanceFalloff: 'quadratic',
                mode: 'beam',
                facing: Math.PI / 4,
                xOffset: 0.25,
                yOffset: -0.25,
                animation: {
                    type: 'flicker',
                    params: {
                        speed: 'fast',
                        intensity: 0.8
                    }
                }
            };

            const component = new LightEmitterComponent(config);
            const serialized = JSON.parse(JSON.stringify(component));
            const deserialized = LightEmitterComponent.fromJSON(serialized);

            expect(deserialized.config).toEqual(config);
        });
    });

    describe('SymbolComponent', () => {
        it('should serialize and deserialize correctly', () => {
            const component = new SymbolComponent('@', '#fff', '#000', 1);
            const serialized = JSON.parse(JSON.stringify(component));
            const deserialized = SymbolComponent.fromJSON(serialized);

            expect(deserialized).toMatchObject(component);
        });
    });
}); 