/**
 * Decorator metadata to track component requirements
 */
export const REQUIRED_COMPONENTS = Symbol('requiredComponents');
export const OPTIONAL_COMPONENTS = Symbol('optionalComponents');

/**
 * Decorator to mark required components for an entity
 */
export function RequiredComponents(...types: string[]) {
  return function (constructor: Function) {
    Reflect.defineMetadata(REQUIRED_COMPONENTS, types, constructor);
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