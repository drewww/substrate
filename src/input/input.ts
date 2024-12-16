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
        // Clear all active states
        this.clearAllStates();
        
        // Clear existing configuration
        this.configErrors = [];
        this.modes = {};
        
        // Parse new configuration
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

    private clearAllStates(): void {
        // Stop all repeat timers
        for (const key in this.repeatTimers) {
            this.stopRepeat(key);
        }
        
        // Clear active keys set
        for (const key of this.activeKeys) {
            // Trigger 'up' events for any keys that were down
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                const mapConfig = modeConfig.maps[this.currentMap];
                
                if (mapConfig[key]) {
                    for (const keyConfig of mapConfig[key]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters);
                    }
                }
            }
        }
        this.activeKeys.clear();

        // Reset modifier state
        this.modifierState = {
            ctrl: false,
            shift: false,
            alt: false,
            meta: false
        };
    }

    private parseConfig(configText: string): void {
        let currentMode: string | null = null;
        let currentMap: string | null = null;
        let inMetadata = true;
        let lineNumber = 0;
        
        const lines = configText.split('\n');
        
        for (const line of lines) {
            lineNumber++;
            const trimmedLine = line.trim();
            
            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;
            
            // Check for mode section start (marked by =====)
            if (trimmedLine.match(/^=+$/)) {
                // Continue with current mode, but reset map and metadata state
                currentMap = null;
                inMetadata = true;
                continue;
            }

            // Parse mode header
            if (trimmedLine.startsWith('mode:')) {
                currentMode = trimmedLine.substring(5).trim();
                currentMap = null;
                inMetadata = true;
                
                if (!this.isValidIdentifier(currentMode)) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Invalid mode identifier: ${currentMode}`,
                        line: lineNumber
                    });
                    continue;
                }
                
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
                if (!this.modes[currentMode].maps[mapName]) {
                    this.modes[currentMode].maps[mapName] = {};
                }
                
                if (isDefault) {
                    if (this.modes[currentMode].defaultMap) {
                        this.configErrors.push({
                            type: 'warning',
                            message: `Multiple default maps specified for mode ${currentMode}. Using ${mapName}`,
                            mode: currentMode,
                            line: lineNumber
                        });
                    }
                    this.modes[currentMode].defaultMap = mapName;
                }
                continue;
            }

            // Check for metadata section separator
            if (trimmedLine === '---') {
                inMetadata = false;
                continue;
            }

            // Parse key mappings
            if (!inMetadata) {
                if (!currentMode || !currentMap) {
                    this.configErrors.push({
                        type: 'error',
                        message: 'Key mapping specified before mode/map',
                        line: lineNumber
                    });
                    continue;
                }

                this.parseKeyMapping(trimmedLine, currentMode, currentMap, lineNumber);
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

    private parseKeyMapping(line: string, mode: string, map: string, lineNumber: number): void {
        const parts = line.split(/\s+/);
        if (parts.length < 2) {
            this.configErrors.push({
                type: 'error',
                message: `Invalid key mapping format: "${line}". Expected "<key>[,<key>...] <action> [parameters...]"`,
                mode: mode,
                map: map,
                line: lineNumber
            });
            return;
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
                mode: mode,
                map: map,
                line: lineNumber
            });
            return;
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
            
            if (!this.modes[mode].maps[map][normalizedKey]) {
                this.modes[mode].maps[map][normalizedKey] = [];
            }
            this.modes[mode].maps[map][normalizedKey].push(keyConfig);
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
        
        const normalizedKey = this.normalizeKey(event.key);
        
        // Only process the keydown if it's not already active (prevent key repeat)
        if (!this.activeKeys.has(normalizedKey)) {
            this.activeKeys.add(normalizedKey);
            
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                const mapConfig = modeConfig.maps[this.currentMap];
                
                // First check for modifier combinations
                const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters);
                    }
                    this.startRepeat(normalizedKey);
                    return;
                }

                // Only check for exact key match if no modifier combo was found
                if (mapConfig[normalizedKey]) {
                    for (const keyConfig of mapConfig[normalizedKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters);
                    }
                    this.startRepeat(normalizedKey);
                }
            }
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const normalizedKey = this.normalizeKey(event.key);
        
        // Stop the repeat timer for this key
        this.stopRepeat(normalizedKey);

        // Find and trigger matching actions before removing from active keys
        if (this.currentMode && this.currentMap) {
            const modeConfig = this.modes[this.currentMode];
            const mapConfig = modeConfig.maps[this.currentMap];
            
            const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
            if (modifierKey && mapConfig[modifierKey]) {
                for (const keyConfig of mapConfig[modifierKey]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters);
                }
            } else if (mapConfig[normalizedKey]) {
                for (const keyConfig of mapConfig[normalizedKey]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters);
                }
            }
        }

        // Remove from active keys
        this.activeKeys.delete(normalizedKey);
        
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

    private startRepeat(key: string): void {
        // Clear any existing timer for this key
        this.stopRepeat(key);
        
        // Start a new repeat timer
        this.repeatTimers[key] = window.setInterval(() => {
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                const mapConfig = modeConfig.maps[this.currentMap];
                
                // Check for modifier combinations first
                const modifierKey = this.getModifierKeyCombo({ 
                    key,
                    ctrlKey: this.modifierState.ctrl,
                    shiftKey: this.modifierState.shift,
                    altKey: this.modifierState.alt,
                    metaKey: this.modifierState.meta
                } as KeyboardEvent, this.normalizeKey(key));

                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('repeat', keyConfig.action, keyConfig.parameters);
                    }
                    return;
                }

                // Check for plain key if no modifier combo was found
                if (mapConfig[key]) {
                    for (const keyConfig of mapConfig[key]) {
                        this.triggerCallbacks('repeat', keyConfig.action, keyConfig.parameters);
                    }
                }
            }
        }, this.repeatInterval);
    }

    private stopRepeat(key: string): void {
        if (this.repeatTimers[key]) {
            window.clearInterval(this.repeatTimers[key]);
            delete this.repeatTimers[key];
        }
    }

    private normalizeKey(key: string): string {
        // Don't lowercase special keys that start with uppercase
        if (key.length > 1 && key.match(/^[A-Z]/)) {
            return key;
        }
        return key.toLowerCase();
    }

    public getAvailableMaps(): string[] {
        if (!this.currentMode || !this.modes[this.currentMode]) {
            return [];
        }
        return Object.keys(this.modes[this.currentMode].maps);
    }
} 