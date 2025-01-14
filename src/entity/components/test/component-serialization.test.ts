import { ComponentRegistry } from '../../component-registry';
import { LightEmitterComponent, LightEmitterConfig } from '../light-emitter-component';
import { Component } from '../../component';
import { describe, it, expect } from 'vitest';


describe('Component Serialization Tests', () => {
    // Test all registered components
    const registeredComponents = ComponentRegistry.getRegisteredComponents();

    Object.entries(registeredComponents).forEach(([type, componentClass]) => {
        describe(`${type} Component`, () => {
            it('should serialize and deserialize correctly', () => {
                const component = createTestComponent(componentClass as typeof Component);
                const serialized = JSON.parse(JSON.stringify(component));
                const deserialized = (componentClass as typeof Component).fromJSON(serialized);
                
                expect(deserialized).toBeInstanceOf(componentClass);
                expect(deserialized).toMatchObject(component);
            });
        });
    });

    // Specific test for LightEmitterComponent to ensure all properties are handled
    describe('LightEmitterComponent Specific Tests', () => {
        it('should handle all LightEmitterConfig properties', () => {
            const config: LightEmitterConfig = {
                radius: 5,
                intensity: 1.0,
                color: '#FFFFFF',
                falloff: 'quadratic',
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
});

// Helper function to create test instances of components
function createTestComponent(componentClass: typeof Component): Component {
    switch (componentClass.name) {
        case 'LightEmitterComponent':
            return new LightEmitterComponent({
                radius: 5,
                intensity: 1.0,
                color: '#FFFFFF',
                falloff: 'quadratic',
                mode: 'omnidirectional'
            });
        // Add cases for other component types
        default:
            throw new Error(`No test configuration for component type: ${componentClass.name}`);
    }
} 