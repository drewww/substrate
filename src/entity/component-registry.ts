import { Component } from "./component";

type ComponentConstructor = {
    new (): Component;  // Only require a no-arg constructor
};

export class ComponentRegistry {
    private static components = new Map<string, ComponentConstructor>();

    static register(type: string, componentClass: ComponentConstructor) {
        this.components.set(type, componentClass);
    }

    static fromJSON(data: any): Component {
        const type = data.type;
        const ComponentClass = this.components.get(type);
        
        if (!ComponentClass) {
            throw new Error(`Unknown component type: ${type}`);
        }

        // Create with default values
        const component = new ComponentClass();
        // Then deserialize the data into it
        component.deserialize(data);
        
        return component;
    }

    public static getRegisteredComponents() {
        return this.components;
    }
}

// Decorator that handles registration
export function RegisterComponent(type: string) {
    return function<T extends ComponentConstructor>(constructor: T) {
        ComponentRegistry.register(type, constructor);
        return constructor;
    };
} 