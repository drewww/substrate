

class Engine {
    private world: World;
    private actionQueue: ActionQueue;
    private updateInterval: number;

    // Handles game simulation
    // Processes game-relevant inputs (movement, actions)
    // Updates entities
    // Maintains game state
}

class Interface {
    private display: Display;
    // UI elements (menus, buttons, overlays)
    // Cursor highlighting
    // UI-specific input handling
    // Can emit actions that Engine might care about
    // Does NOT directly modify game state
}

class Game {
    private engine: Engine;
    private interface: Interface;
    private input: InputManager;
    private display: Display;
    private renderer: Renderer;

    constructor() {
        // Create core systems
        this.display = new Display(config);
        this.input = new InputManager();
        this.renderer = new Renderer();
        
        // Create main components
        this.engine = new Engine(this.world);
        this.interface = new Interface(this.display);

        // Wire up input handlers
        this.input.on('action', (action) => {
            // Route to appropriate system
            if (isGameAction(action)) {
                this.engine.handleAction(action);
            } else if (isUIAction(action)) {
                this.interface.handleAction(action);
            }
        });
    }

    // Handles high-level game flow
    // Scene/level management
    // System coordination
}