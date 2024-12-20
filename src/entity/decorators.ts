/**
 * Decorator metadata to track component requirements
 */
export const REQUIRED_COMPONENTS = Symbol('requiredComponents');
export const OPTIONAL_COMPONENTS = Symbol('optionalComponents');

/**
 * Decorator to mark required components for an entity
 */
export function RequiredComponents(components: string[]) {
  return function (constructor: Function) {
    constructor.prototype.requiredComponents = components;
    constructor.prototype.validateRequiredComponents = function() {
      for (const component of components) {
        if (!this.hasComponent(component)) {
          throw new Error(`Entity ${this.getId()} is missing required component: ${component}`);
        }
      }
    };
  };
}

/**
 * Decorator to mark optional components for an entity
 */
export function OptionalComponents(...types: string[]) {
  return function (constructor: Function) {
    Reflect.defineMetadata(OPTIONAL_COMPONENTS, types, constructor);
  };
} 