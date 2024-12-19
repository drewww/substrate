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
    private setIntervalFn: typeof window.setInterval;
    private clearIntervalFn: typeof window.clearInterval;

    constructor(options: {
        addEventListener?: typeof window.addEventListener,
        setInterval?: typeof window.setInterval,
        clearInterval?: typeof window.clearInterval
    } = {}) {
        const addListener = options.addEventListener || window.addEventListener;
        this.setIntervalFn = options.setInterval || window.setInterval;
        this.clearIntervalFn = options.clearInterval || window.clearInterval;

        addListener('keydown', this.handleKeyDown.bind(this));
        addListener('keyup', this.handleKeyUp.bind(this));
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
        // Stop all repeat timers first
        for (const key in this.repeatTimers) {
            this.stopRepeat(key);
        }
        
        // Clear active keys set and trigger 'up' events
        for (const key of this.activeKeys) {
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
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, key);
                    }
                } else if (mapConfig[key]) {
                    for (const keyConfig of mapConfig[key]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, key);
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
                if (!currentMode || !trimmedLine.startsWith('='.repeat(10))) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Invalid section separator: ${trimmedLine}. Mode separators must be exactly 10 '=' characters and must follow a mode declaration`,
                        line: lineNumber
                    });
                    continue;
                }
                currentMap = null;
                inMetadata = true;
                continue;
            }

            // Check for map section separator (marked by ---)
            if (trimmedLine.match(/^-+$/)) {
                inMetadata = false;  // Start accepting key mappings
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
                
                // Initialize the mode structure immediately, even for invalid identifiers
                this.modes[currentMode] = {
                    maps: {},
                    defaultMap: ''
                };
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
                
                // Skip map processing if the mode was invalid
                if (!this.modes[currentMode]) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Cannot add map to invalid mode: ${currentMode}`,
                        line: lineNumber
                    });
                    continue;
                }
                
                const parts = trimmedLine.substring(4).trim().split(/\s+/);
                const mapName = parts[0];
                
                // Check if this is a pass-through mode
                if (mapName === 'pass') {
                    // Pass-through modes can only have one map named 'pass'
                    if (Object.keys(this.modes[currentMode].maps).length > 0) {
                        this.configErrors.push({
                            type: 'error',
                            message: `Pass-through mode ${currentMode} cannot have other maps`,
                            line: lineNumber
                        });
                        continue;
                    }
                    
                    // Set up pass-through map
                    currentMap = mapName;
                    this.modes[currentMode].maps[mapName] = {};
                    this.modes[currentMode].defaultMap = mapName;
                    
                    // Pass-through modes don't accept any key mappings
                    inMetadata = false;
                    continue;
                }
                
                // Normal map processing
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
                
                if (parts.includes('default')) {
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

            // For pass-through modes, ignore any key mappings
            if (currentMap === 'pass') {
                this.configErrors.push({
                    type: 'error',
                    message: 'Key mappings not allowed in pass-through mode',
                    mode: currentMode || '',
                    line: lineNumber
                });
                continue;
            }

            // Parse key mappings for normal modes
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
        
        // Check for old pass syntax
        if (keyList.includes('pass')) {
            this.configErrors.push({
                type: 'error',
                message: `Invalid key binding "pass". Pass-through functionality must be configured as a dedicated mode with "map: pass"`,
                mode: mode,
                map: map,
                line: lineNumber
            });
            return;
        }

        // Validate each key in the list
        for (const key of keyList) {
            // Split for modifier keys
            const keyParts = key.split('+');
            const mainKey = keyParts[keyParts.length - 1];
            const modifiers = keyParts.slice(0, -1);

            // Validate modifiers
            for (const modifier of modifiers) {
                if (!['Control', 'Shift', 'Alt', 'Meta'].includes(modifier)) {
                    this.configErrors.push({
                        type: 'error',
                        message: `Invalid modifier key: "${modifier}" in "${key}"`,
                        mode: mode,
                        map: map,
                        line: lineNumber
                    });
                    return;
                }
            }

            // Validate main key
            // List of valid special keys
            const specialKeys = [
                'Enter', 'Tab', 'Space', 'Backspace', 'Delete', 'Insert', 'Home', 'End', 'PageUp', 'PageDown',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape',
                'Control', 'Shift', 'Alt', 'Meta'
            ];

            // Check if it's a single character or special key
            if (!(mainKey.length === 1 || specialKeys.includes(mainKey))) {
                this.configErrors.push({
                    type: 'error',
                    message: `Invalid key: "${mainKey}" in "${key}"`,
                    mode: mode,
                    map: map,
                    line: lineNumber
                });
                return;
            }
        }
        
        // Second part is the action
        const action = parts[1];
        
        // Validate action name format (letters and dashes only)
        if (!this.isValidActionName(action)) {
            this.configErrors.push({
                type: 'error',
                message: `Invalid action name "${action}". Action names must contain only letters and dashes`,
                mode: mode,
                map: map,
                line: lineNumber
            });
            return;
        }
        
        // Remaining parts are parameters
        const parameters = parts.slice(2);
        
        // Add mappings - each key in the comma-separated list maps to the same action
        for (const key of keyList) {
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
    
    private isValidActionName(action: string): boolean {
        return /^[a-zA-Z][a-zA-Z-]*$/.test(action);
    }

    public setMode(mode: string): void {
        if (!this.modes[mode]) {
            throw new Error(`Mode '${mode}' does not exist`);
        }

        // Before changing modes, trigger 'up' events for all active keys
        if (this.currentMode && this.currentMap) {
            const mapConfig = this.modes[this.currentMode].maps[this.currentMap];
            for (const key of this.activeKeys) {
                if (mapConfig[key]) {
                    for (const keyConfig of mapConfig[key]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, key);
                    }
                }
            }
        }

        // Clear active keys and repeat timers without triggering additional events
        for (const key of this.activeKeys) {
            this.stopRepeat(key);
        }
        this.activeKeys.clear();

        // Set the new mode and its default map
        this.currentMode = mode;
        this.currentMap = this.modes[mode].defaultMap;
    }

    public setMap(mapName: string): void {
        if (!this.currentMode || !this.modes[this.currentMode].maps[mapName]) {
            throw new Error(`Map ${mapName} not found in mode ${this.currentMode}`);
        }

        // Before changing maps, trigger 'up' events for all active keys
        const oldMap = this.currentMap;
        if (oldMap) {
            const mapConfig = this.modes[this.currentMode].maps[oldMap];
            for (const key of this.activeKeys) {
                if (mapConfig[key]) {
                    for (const keyConfig of mapConfig[key]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, key);
                    }
                }
            }
        }

        // Clear active keys and repeat timers without triggering additional events
        for (const key of this.activeKeys) {
            this.stopRepeat(key);
        }
        this.activeKeys.clear();
        
        // Set the new map
        this.currentMap = mapName;
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
        if (!this.modes[mode]) {
            return [];
        }

        // Get all maps for this mode
        const modeConfig = this.modes[mode];
        
        // If this is a pass-through mode (has only one map named 'pass')
        if (Object.keys(modeConfig.maps).length === 1 && modeConfig.maps['pass']) {
            return ['key'];
        }
        
        // Create a Set to store unique actions
        const actions = new Set<string>();
        
        // For each map in the mode
        Object.values(modeConfig.maps).forEach(map => {
            // For each key binding in the map
            Object.values(map).forEach(keyConfigs => {
                // For each action configured for this key
                keyConfigs.forEach(config => {
                    actions.add(config.action);
                });
            });
        });
        
        return Array.from(actions).sort();
    }
    
    public listKeysForAction(mode: string, action: string): string[] {
        if (!this.modes[mode]) {
            return [];
        }
    
        const modeConfig = this.modes[mode];
        const keys: string[] = [];
        
        // For each map in the mode
        Object.entries(modeConfig.maps).forEach(([mapName, map]) => {
            // For each key binding in the map
            Object.entries(map).forEach(([key, keyConfigs]) => {
                // If any action for this key matches our target action
                if (keyConfigs.some(config => config.action.toLowerCase() === action.toLowerCase())) {
                    // Add the key with the map name if it's not the default map
                    const isDefault = mapName === modeConfig.defaultMap;
                    keys.push(isDefault ? key : `${key} (${mapName})`);
                }
            });
        });
        
        return keys.sort();
    }

    private handleKeyDown(event: KeyboardEvent): void {
        this.updateModifierState(event);
        
        const normalizedKey = this.normalizeKey(event.key);
        
        // Only process the keydown if it's not already active
        if (!this.activeKeys.has(normalizedKey)) {
            this.activeKeys.add(normalizedKey);
            
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                
                // Handle pass-through mode
                if (this.currentMap === 'pass') {
                    const activeModifiers = [];
                    if (this.modifierState.ctrl) activeModifiers.push('ctrl');
                    if (this.modifierState.shift) activeModifiers.push('shift');
                    if (this.modifierState.alt) activeModifiers.push('alt');
                    if (this.modifierState.meta) activeModifiers.push('meta');
                    
                    this.triggerCallbacks('down', 'key', [normalizedKey, ...activeModifiers], normalizedKey);
                    event.preventDefault();
                    
                    // Only start repeat for non-modifier keys
                    if (!this.isModifierKey(normalizedKey)) {
                        this.startRepeat(normalizedKey);
                    }
                    return;
                }
                
                // Normal mode handling...
                const mapConfig = modeConfig.maps[this.currentMap];
                const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
                
                let handled = false;
                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                    this.startRepeat(normalizedKey);
                } else if (mapConfig[normalizedKey]) {
                    for (const keyConfig of mapConfig[normalizedKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                    this.startRepeat(normalizedKey);
                }
                
                if (handled) {
                    event.preventDefault();
                }
            }
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const normalizedKey = this.normalizeKey(event.key);
        
        // Skip standalone modifier keys
        if (this.isModifierKey(normalizedKey)) {
            this.updateModifierState(event);
            return;
        }
        
        this.stopRepeat(normalizedKey);

        if (this.currentMode && this.currentMap) {
            const modeConfig = this.modes[this.currentMode];
            
            // Handle pass-through mode
            if (this.currentMap === 'pass') {
                const activeModifiers = [];
                if (this.modifierState.ctrl) activeModifiers.push('ctrl');
                if (this.modifierState.shift) activeModifiers.push('shift');
                if (this.modifierState.alt) activeModifiers.push('alt');
                if (this.modifierState.meta) activeModifiers.push('meta');
                
                this.triggerCallbacks('up', 'key', [normalizedKey, ...activeModifiers], normalizedKey);
            } else {
                // Normal mode handling...
                const mapConfig = modeConfig.maps[this.currentMap];
                const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
                
                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, normalizedKey);
                    }
                } else if (mapConfig[normalizedKey]) {
                    for (const keyConfig of mapConfig[normalizedKey]) {
                        this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, normalizedKey);
                    }
                }
            }
        }

        this.activeKeys.delete(normalizedKey);
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

    private triggerCallbacks(eventType: string, action: string, parameters: string[], key: string): void {
        const modifierState = {
            ctrl: this.modifierState.ctrl,
            shift: this.modifierState.shift,
            alt: this.modifierState.alt,
            meta: this.modifierState.meta
        };

        for (const registration of this.callbacks) {
            // Skip if callback is mode-specific and doesn't match current mode
            if (registration.mode && registration.mode !== this.currentMode) {
                continue;
            }
            
            const result = registration.callback(eventType, action, parameters, modifierState);
            
            // If callback returns true, stop propagation
            if (result === true) break;
        }
    }

    private startRepeat(key: string): void {
        if (this.isModifierKey(key)) {
            return;
        }

        this.stopRepeat(key);
        
        this.repeatTimers[key] = this.setIntervalFn(() => {
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                const mapConfig = modeConfig.maps[this.currentMap];
                
                const normalizedKey = this.normalizeKey(key);
                
                // Try normal key mappings first
                const modifierKey = this.getModifierKeyCombo({ 
                    key: normalizedKey,
                    ctrlKey: this.modifierState.ctrl,
                    shiftKey: this.modifierState.shift,
                    altKey: this.modifierState.alt,
                    metaKey: this.modifierState.meta
                } as KeyboardEvent, normalizedKey);
                
                let handled = false;
                
                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('repeat', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                } else if (mapConfig[normalizedKey]) {
                    for (const keyConfig of mapConfig[normalizedKey]) {
                        this.triggerCallbacks('repeat', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                }
                
                // If no normal mapping handled it, try pass as fallback
                if (!handled && mapConfig['pass']) {
                    for (const keyConfig of mapConfig['pass']) {
                        const activeModifiers = [];
                        if (this.modifierState.ctrl) activeModifiers.push('ctrl');
                        if (this.modifierState.shift) activeModifiers.push('shift');
                        if (this.modifierState.alt) activeModifiers.push('alt');
                        if (this.modifierState.meta) activeModifiers.push('meta');
                        
                        const parameters = [
                            ...keyConfig.parameters,
                            normalizedKey,
                            ...activeModifiers
                        ];
                        
                        this.triggerCallbacks('repeat', keyConfig.action, parameters, normalizedKey);
                    }
                }
            }
        }, this.repeatInterval);
    }

    private stopRepeat(key: string): void {
        if (this.repeatTimers[key]) {
            this.clearIntervalFn(this.repeatTimers[key]);
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

    public getConfigStats(): { 
        modes: { name: string, mapCount: number }[],
        totalMappings: number,
        errorCount: number,
        warningCount: number 
    } {
        const modes = Object.entries(this.modes).map(([name, config]) => ({
            name,
            mapCount: Object.keys(config.maps).length
        }));

        const totalMappings = Object.values(this.modes).reduce((total, mode) => {
            return total + Object.entries(mode.maps).reduce((modeTotal, [mapName, map]) => {
                // For pass-through maps, count as 1 mapping
                if (mapName === 'pass') {
                    return modeTotal + 1;
                }
                // For normal maps, count actual key bindings
                return modeTotal + Object.values(map).reduce((mapTotal, actions) => 
                    mapTotal + actions.length, 0);
            }, 0);
        }, 0);

        const errorCount = this.configErrors.filter(e => e.type === 'error').length;
        const warningCount = this.configErrors.filter(e => e.type === 'warning').length;

        return {
            modes,
            totalMappings,
            errorCount,
            warningCount
        };
    }

    public getModes(): { [mode: string]: ModeConfig } {
        return this.modes;
    }

    public getCurrentMode(): string {
        return this.currentMode;
    }

    // Add helper method to check for modifier keys
    private isModifierKey(key: string): boolean {
        const normalizedKey = this.normalizeKey(key);
        return normalizedKey === 'control' || 
               normalizedKey === 'shift' || 
               normalizedKey === 'alt' || 
               normalizedKey === 'meta';
    }
} 