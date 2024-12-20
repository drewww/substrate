/**
 * Decorator to mark a property as transient (excluded from serialization)
 */
export function transient(target: any, propertyKey: string) {
    if (!target.constructor.transientProperties) {
        target.constructor.transientProperties = new Set<string>();
    }
    target.constructor.transientProperties.add(propertyKey);
}

/**
 * Helper function to check if a property is transient
 */
export function isTransient(obj: any, propertyKey: string): boolean {
    return obj.constructor.transientProperties?.has(propertyKey) ?? false;
} 