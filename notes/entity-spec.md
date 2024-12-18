# Entity System

Entities are the basic building blocks of the game. Every object in the world has an entity associated with it.

## Core Concepts

### Entity
- Contains only a unique identifier and a collection of components
- No behavior of its own
- Pure data container
- Serializable

### Components
- Hold specific pieces of state
- No behavior of their own
- Pure data
- Serializable
- Examples:
  * ToggleableComponent (tracks enabled/disabled state)
  * DoorBehaviorComponent (door-specific properties)
  * PositionComponent (x, y coordinates)
  * PassableComponent (can be walked through, run through, jumped over but not entered, etc.)
  * VisibilityComponent (blocks line of sight)
  * RotationComponent (degrees, radians?)


### Component Design Principles
1. Components should be pure state
2. Components should be independent of each other
3. Components should be reusable across different entity types
4. Components should be serializable
5. Components should not contain presentation logic
6. Components should not reference transient system state (like TileIds)


### Questions About Entity/Component Design
- How will we handle component versioning if we need to change component data structures?
    - We will not handle versioning in v1, but an important thing to consisder later.
- How do we handle optional vs required components?
    - Yes, we will allow optional/required components and handle it using TypeScript decorators.
- Do we need component inheritance or interfaces?
    - Interfaces could help define common shapes (e.g. IPositionable for anything with x,y coords)
    - Inheritance risks creating rigid hierarchies that are hard to change
    - Consider composition over inheritance - shared behaviors through mixins?
    - TypeScript type unions may be better than class hierarchies

- How do we validate component data?
    - Runtime validation vs compile-time type checking
    - Consider JSON Schema for serialized data validation
    - Validation hooks during component updates?
    - How to handle invalid data - throw, warn, or auto-correct?
    - Performance impact of validation needs to be considered

- Should components have default values?
    - Default values simplify creation but can mask bugs
    - Consider making all fields explicitly required in types
    - If using defaults, document them clearly
    - May want different defaults for different entity types

- How do we handle component relationships/dependencies?
    - Explicit dependencies vs implicit relationships
    - Consider using events/signals for loose coupling
    - Need strategy for handling missing dependencies
    - May want to validate dependency graphs at startup

- What's our strategy for component reuse vs specificity?
    - Very generic components are reusable but may be inefficient
    - Very specific components are efficient but lead to duplication
    - Consider composing specific components from generic ones
    - May want different strategies for different component types

- How do we handle component lifecycle (initialization, cleanup)?
    - Need hooks for setup/teardown
    - Consider pooling for frequently created/destroyed components
    - How to handle failed initialization
    - Cleanup order may matter for dependent components

- Should components be able to be added/removed dynamically?
    - Runtime flexibility vs compile-time safety
    - Performance impact of dynamic components
    - How to handle in-progress operations when components change
    - May need different rules for different game states
    - Yes, we will allow this.
- How do we handle entity/component metadata (like creation time, last modified)?
    - We will not handle this in v1.
- What's our naming convention for components?
    - We will use camelCase for component names.
- How do we document component contracts and expectations?
    - We will use JSDoc comments to document the expected structure of components.









