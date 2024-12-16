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
        isPass: boolean;
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
            const normalizedKey = key.includes('+')
                ? key.split('+')
                    .map(part => this.normalizeKey(part.trim()))
                    .join('+')
                : this.normalizeKey(key);

            const keyConfig = {
                action,
                parameters,
                isPass: key === 'pass'
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
        
        // Clear states before changing maps
        this.clearAllStates();
        
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
        if (!this.modes[mode]) {
            return [];
        }
    
        // Get all maps for this mode
        const modeConfig = this.modes[mode];
        
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
        
        // Skip standalone modifier keys entirely
        if (this.isModifierKey(normalizedKey)) {
            return;
        }

        // Prevent default browser behavior for arrow keys
        if (normalizedKey.startsWith('Arrow') || normalizedKey === 'Enter') {
            event.preventDefault();
        }

        // Only process the keydown if it's not already active (prevent key repeat)
        if (!this.activeKeys.has(normalizedKey)) {
            this.activeKeys.add(normalizedKey);
            
            if (this.currentMode && this.currentMap) {
                const modeConfig = this.modes[this.currentMode];
                const mapConfig = modeConfig.maps[this.currentMap];
                
                // Try normal key mappings first
                const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
                let handled = false;
                
                if (modifierKey && mapConfig[modifierKey]) {
                    for (const keyConfig of mapConfig[modifierKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                    if (handled) {
                        this.startRepeat(normalizedKey);
                        return;
                    }
                }
                
                if (mapConfig[normalizedKey]) {
                    for (const keyConfig of mapConfig[normalizedKey]) {
                        this.triggerCallbacks('down', keyConfig.action, keyConfig.parameters, normalizedKey);
                        handled = true;
                    }
                    if (handled) {
                        this.startRepeat(normalizedKey);
                        return;
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
                        
                        this.triggerCallbacks('down', keyConfig.action, parameters, normalizedKey);
                    }

                    if(!modifierKey) {
                        this.startRepeat(normalizedKey);
                    }
                }
            }
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        const normalizedKey = this.normalizeKey(event.key);
        
        // Skip standalone modifier keys entirely
        if (normalizedKey === 'control' || normalizedKey === 'shift' || 
            normalizedKey === 'alt' || normalizedKey === 'meta') {
            // Update modifier state before returning
            this.updateModifierState(event);
            return;
        }
        
        // Stop the repeat timer for this key
        this.stopRepeat(normalizedKey);

        if (this.currentMode && this.currentMap) {
            const modeConfig = this.modes[this.currentMode];
            const mapConfig = modeConfig.maps[this.currentMap];
            
            // Try normal key mappings first
            let handled = false;
            const modifierKey = this.getModifierKeyCombo(event, normalizedKey);
            
            if (modifierKey && mapConfig[modifierKey]) {
                for (const keyConfig of mapConfig[modifierKey]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, normalizedKey);
                    handled = true;
                }
            } else if (mapConfig[normalizedKey]) {
                for (const keyConfig of mapConfig[normalizedKey]) {
                    this.triggerCallbacks('up', keyConfig.action, keyConfig.parameters, normalizedKey);
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
                    
                    this.triggerCallbacks('up', keyConfig.action, parameters, normalizedKey);
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

    private triggerCallbacks(eventType: string, action: string, parameters: string[], key: string): void {
        for (const registration of this.callbacks) {
            // Skip if callback is mode-specific and doesn't match current mode
            if (registration.mode && registration.mode !== this.currentMode) {
                continue;
            }
            
            // For 'pass' action, append the key name to parameters
            const finalParameters = action === 'pass' ? [...parameters, key] : parameters;
            
            const result = registration.callback(eventType, action, finalParameters, this.modifierState);
            
            // If callback returns true, stop propagation
            if (result === true) break;
        }
    }

    private startRepeat(key: string): void {
        // Don't start repeat for modifier keys
        if (this.isModifierKey(key)) {
            return;
        }

        // Clear any existing timer for this key
        this.stopRepeat(key);
        
        // Start a new repeat timer
        this.repeatTimers[key] = window.setInterval(() => {
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
            return total + Object.values(mode.maps).reduce((modeTotal, map) => {
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