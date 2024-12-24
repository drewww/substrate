import { Component } from "./component";

type ComponentConstructor = {
    new (...args: any[]): Component;
    fromJSON(data: any): Component;
};

export class ComponentRegistry {
    private static components = new Map<string, new () => Component>();

    static register(type: string, componentClass: new () => Component) {
        this.components.set(type, componentClass);
    }

    static fromJSON(data: any): Component {
        const type = data.type;
        const ComponentClass = this.components.get(type);
        
        if (!ComponentClass) {
            throw new Error(`Unknown component type: ${type}`);
        }

        // Create new instance and deserialize directly
        const component = new ComponentClass();
        component.deserialize(data);
        return component;
    }
}

// Decorator that handles registration
export function RegisterComponent(type: string) {
    return function<T extends ComponentConstructor>(constructor: T) {
        ComponentRegistry.register(type, constructor);
        return constructor;
    };
} 