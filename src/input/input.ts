type ModifierState = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
};

type ActionCallback = (actionType: string, action: string, parameters: string[], modifiers: ModifierState) => boolean | void;

type CallbackRegistration = {
    callback: ActionCallback;
    order: number;
    mode?: string;
};

type ConfigError = {
    type: 'error' | 'warning';
    message: string;
    mode?: string;
    map?: string;
    line?: number;
};

type KeyMap = {
    [key: string]: {
        action: string;
        parameters: string[];
    }[];
};

type ModeConfig = {
    maps: {
        [mapName: string]: KeyMap;
    };
    defaultMap: string;
};

export class InputManager {
    private modes: { [mode: string]: ModeConfig } = {};
    private callbacks: CallbackRegistration[] = [];
    private currentMode: string = '';
    private currentMap: string = '';
    private activeKeys: Set<string> = new Set();
    private configErrors: ConfigError[] = [];
    private repeatInterval: number = 125; // 8 times per second
    private repeatTimers: { [key: string]: number } = {};
    private modifierState: ModifierState = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false
    };

    constructor() {
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        window.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    public loadConfig(configText: string): void {
        this.configErrors = [];
        this.modes = {}; // Clear existing modes
        this.parseConfig(configText);
        
        // Reset current mode/map
        this.currentMode = '';
        this.currentMap = '';

        // Set to first mode and its default map if available
        const firstMode = Object.keys(this.modes)[0];
        if (firstMode) {
            this.currentMode = firstMode;
            this.currentMap = this.modes[firstMode].defaultMap;
        }
    }

    private parseConfig(configText: string): void {
        let currentMode: string | null = null;
        let currentMap: string | null = null;
        let lineNumber = 0;
        
        const lines = configText.split('\n');
        
        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;
            
            // Parse mode header
            if (trimmedLine.startsWith('mode:')) {
                const mode = trimmedLine.substring(5).trim();
                if (!this.isValidIdentifier(mode)) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Invalid mode identifier: ${mode}`,
                        line: lineNumber
                    });
                    continue;
                }
                currentMode = mode;
                if (!this.modes[currentMode]) {
                    this.modes[currentMode] = {
                        maps: {},
                        defaultMap: ''
                    };
                }
                continue;
            }
            
            // Parse map header
            if (trimmedLine.startsWith('map:')) {
                if (!currentMode) {
                    this.configErrors.push({
                        type: 'error',
                        message: 'Map specified before mode',
                        line: lineNumber
                    });
                    continue;
                }
                
                const parts = trimmedLine.substring(4).trim().split(/\s+/);
                const mapName = parts[0];
                const isDefault = parts.includes('default');
                
                if (!this.isValidIdentifier(mapName)) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Invalid map identifier: ${mapName}`,
                        line: lineNumber
                    });
                    continue;
                }
                
                currentMap = mapName;
                if (!this.modes[currentMode].maps[currentMap]) {
                    this.modes[currentMode].maps[currentMap] = {};
                }
                
                if (isDefault) {
                    if (this.modes[currentMode].defaultMap) {
                        this.configErrors.push({
                            type: 'warning',
                            message: `Multiple default maps specified for mode ${currentMode}. Using ${currentMap}`,
                            mode: currentMode,
                            line: lineNumber
                        });
                    }
                    this.modes[currentMode].defaultMap = currentMap;
                }
                continue;
            }
            
            // End of metadata section
            if (trimmedLine === '---') {
                continue;
            }
            
            // Parse key mappings
            if (!currentMode || !currentMap) {
                this.configErrors.push({
                    type: 'error',
                    message: 'Key mapping specified before mode and map',
                    line: lineNumber
                });
                continue;
            }
            
            // Split line into keys, actions, and parameters using whitespace
            // But preserve spaces within quoted strings if we add those later
            const parts = trimmedLine.split(/\s+/);
            if (parts.length < 2) {
                this.configErrors.push({
                    type: 'error',
                    message: `Invalid key mapping format: "${trimmedLine}". Expected "<key>[,<key>...] <action> [parameters...]"`,
                    mode: currentMode,
                    map: currentMap,
                    line: lineNumber
                });
                continue;
            }
            
            // First part is the key list
            const keyList = parts[0].split(',').map(k => k.trim());
            
            // Second part is the action
            const action = parts[1];
            
            // Remaining parts are parameters
            const parameters = parts.slice(2);
            
            // Validate action
            if (!this.isValidAction(action)) {
                this.configErrors.push({
                    type: 'error',
                    message: `Invalid action name: ${action}`,
                    mode: currentMode,
                    map: currentMap,
                    line: lineNumber
                });
                continue;
            }
            
            // Add mappings - each key in the comma-separated list maps to the same action
            for (const key of keyList) {
                // Normalize the key or key combination
                const normalizedKey = key.includes('+')
                    ? key.split('+')
                        .map(part => this.normalizeKey(part.trim()))
                        .join('+')
                    : this.normalizeKey(key);

                const keyConfig = {
                    action,
                    parameters
                };
                
                if (!this.modes[currentMode].maps[currentMap][normalizedKey]) {
                    this.modes[currentMode].maps[currentMap][normalizedKey] = [];
                }
                this.modes[currentMode].maps[currentMap][normalizedKey].push(keyConfig);
            }
        }
        
        // Set default maps where none specified
        for (const [mode, config] of Object.entries(this.modes)) {
            if (!config.defaultMap && Object.keys(config.maps).length > 0) {
                config.defaultMap = Object.keys(config.maps)[0];
                this.configErrors.push({
                    type: 'warning',
                    message: `No default map specified for mode ${mode}. Using ${config.defaultMap}`,
                    mode
                });
            }
        }
    }
    
    private isValidIdentifier(id: string): boolean {
        return /^[a-zA-Z][a-zA-Z0-9-]*$/.test(id);
    }
    
    private isValidAction(action: string): boolean {
        return /^[a-zA-Z][a-zA-Z-]*$/.test(action);
    }

    public setMode(mode: string): void {
        if (!this.modes[mode]) {
            throw new Error(`Mode '${mode}' does not exist`);
        }
        this.currentMode = mode;
        this.currentMap = this.modes[mode].defaultMap;
    }

    public setMap(map: string): void {
        if (!this.currentMode) {
            throw new Error('No mode selected');
        }
        if (!this.modes[this.currentMode].maps[map]) {
            throw new Error(`Map '${map}' does not exist in mode '${this.currentMode}'`);
        }
        this.currentMap = map;
    }

    public registerCallback(callback: ActionCallback, order: number, mode?: string): void {
        this.callbacks.push({ callback, order, mode });
        // Sort callbacks by order (lower numbers execute first)
        this.callbacks.sort((a, b) => a.order - b.order);
    }
    public getConfigErrors(): ConfigError[] {
        return this.configErrors;
    }
    public listActions(mode: string): string[] {
        return [];
    }
    public listKeysForAction(mode: string, action: string): string[] {
        return [];
    }

    private handleKeyDown(event: KeyboardEvent): void {
        this.updateModifierState(event);
        
        // Normalize the key
        const normalizedKey = this.normalizeKey(event.key);
        this.activeKeys.add(normalizedKey);

        if (this.currentMode && this.currentMap) {
            const modeConfig = this.modes[this.currentMode];
            const mapConfig = modeConfig.maps[this.currentMap];
            
            // Check for exact key match with normalized key
            if (mapConfig[normalizedKey]) {
                for (const keyConfig of mapConfig[normalizedKey]) {
                    this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters);
                }
            }

            // Check for modifier combinations with normalized key
            const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
            if (modifierKey && mapConfig[modifierKey]) {
                for (const keyConfig of mapConfig[modifierKey]) {
                    this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters);
                }
            }
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        // Find and trigger matching actions before removing from active keys
        if (this.currentMode && this.currentMap) {
            const modeConfig = this.modes[this.currentMode];
            const mapConfig = modeConfig.maps[this.currentMap];
            
            if (mapConfig[event.key]) {
                for (const keyConfig of mapConfig[event.key]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters);
                }
            }

            const modifierKey = this.getModifierKeyCombo(event, this.normalizeKey(event.key));
            if (modifierKey && mapConfig[modifierKey]) {
                for (const keyConfig of mapConfig[modifierKey]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters);
                }
            }
        }

        // Remove from active keys
        this.activeKeys.delete(event.key);
        
        // Update modifier state
        this.updateModifierState(event);
    }

    private updateModifierState(event: KeyboardEvent): void {
        this.modifierState = {
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey
        };
    }

    private getModifierKeyCombo(event: KeyboardEvent, normalizedKey: string): string | null {
        const modifiers: string[] = [];
        if (event.ctrlKey) modifiers.push('Control');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.altKey) modifiers.push('Alt');
        if (event.metaKey) modifiers.push('Meta');
        
        if (modifiers.length === 0) return null;
        
        return `${modifiers.join('+')}+${normalizedKey}`;
    }

    private triggerCallbacks(eventType: string, action: string, parameters: string[]): void {
        for (const registration of this.callbacks) {
            // Skip if callback is mode-specific and doesn't match current mode
            if (registration.mode && registration.mode !== this.currentMode) {
                continue;
            }
            
            const result = registration.callback(eventType, action, parameters, this.modifierState);
            
            // If callback returns true, stop propagation
            if (result === true) break;
        }
    }

    private startRepeat(key: string): void {}
    private stopRepeat(key: string): void {}

    private normalizeKey(key: string): string {
        // Don't lowercase special keys that start with uppercase
        if (key.length > 1 && key.match(/^[A-Z]/)) {
            return key;
        }
        return key.toLowerCase();
    }
} 