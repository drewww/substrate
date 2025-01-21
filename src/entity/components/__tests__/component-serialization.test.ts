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
            const component = new LightEmitterComponent({
                radius: 5,
                intensity: 1.0,
                color: '#ffffff',
                facing: 0,
                width: 90,
                distanceFalloff: 'linear'
            });
            
            const serialized = component.serialize();
            const deserialized = LightEmitterComponent.fromJSON(serialized);
            
            expect(deserialized.config).toEqual(expect.objectContaining({
                radius: 5,
                intensity: 1.0,
                color: '#ffffff',
                facing: 0,
                width: 90,
                distanceFalloff: 'linear'
            }));
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