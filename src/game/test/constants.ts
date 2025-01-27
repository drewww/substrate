export const TICK_MS = 200;

// Common cooldowns in ticks
export const COOLDOWNS = {
    PLAYER_MOVE: 5,    // was 1000ms
    ENEMY_MOVE: 5,     // was 1000ms
    TOGGLE: 5,         // was 1000ms
    STUN: 15,         // was 3000ms
    FAST_MOVE: 2,      // was 300ms (for inertia)
    MEDIUM_MOVE: 3     // was 500ms (for inertia)
} as const; 