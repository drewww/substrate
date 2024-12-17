import { InputManager } from '../input';

export class InputTest {
    private inputManager: InputManager;
    private configTextarea: HTMLTextAreaElement;
    private configStatus: HTMLPreElement;
    private inputLog: HTMLPreElement;
    private actionLog: HTMLPreElement;
    private mapSelect: HTMLSelectElement;
    private modeSelect: HTMLSelectElement;
    private actionBindings: HTMLPreElement;
    
    constructor() {
        this.inputManager = new InputManager();
        
        // Get references to DOM elements
        this.configTextarea = document.getElementById('config') as HTMLTextAreaElement;
        this.configStatus = document.getElementById('config-status') as HTMLPreElement;
        this.inputLog = document.getElementById('input-log') as HTMLPreElement;
        this.actionLog = document.getElementById('action-log') as HTMLPreElement;
        this.mapSelect = document.getElementById('map-select') as HTMLSelectElement;
        this.modeSelect = document.getElementById('mode-select') as HTMLSelectElement;
        this.actionBindings = document.getElementById('action-bindings') as HTMLPreElement;

        // Set default config
        this.configTextarea.value = this.getDefaultConfig();

        // Setup event listeners
        document.getElementById('load-config')!.onclick = () => this.loadConfig();
        document.getElementById('clear-logs')!.onclick = () => this.clearLogs();
        this.mapSelect.onchange = () => this.changeMap();
        this.modeSelect.onchange = () => this.changeMode();
        
        // Setup input logging
        this.setupEventListeners();
    }

    private changeMap(): void {
        const selectedMap = this.mapSelect.value;
        if (selectedMap) {
            this.inputManager.setMap(selectedMap);
            this.updateActionBindings();
        }
    }

    private updateMapSelect(): void {
        // Clear existing options
        this.mapSelect.innerHTML = '';
        
        // Get available maps from input manager
        const maps = this.inputManager.getAvailableMaps();
        
        // Add options for each map
        for (const map of maps) {
            const option = document.createElement('option');
            option.value = map;
            option.textContent = map;
            this.mapSelect.appendChild(option);
        }
    }

    private updateModeSelect(): void {
        // Clear existing options
        this.modeSelect.innerHTML = '';
        
        // Get available modes from input manager
        const modes = Object.keys(this.inputManager.getModes());
        
        // Add options for each mode
        for (const mode of modes) {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode;
            this.modeSelect.appendChild(option);
        }

        // Select current mode if any
        const currentMode = this.inputManager.getCurrentMode();
        if (currentMode) {
            this.modeSelect.value = currentMode;
        }
    }

    private getDefaultConfig(): string {
        return `mode: game
==========
map: wasd default
---
w,ArrowUp        move    up
s,ArrowDown      move    down
a,ArrowLeft      move    left
d,ArrowRight     move    right
Control          crouch
Shift+w          sprint  up
Shift+s          sprint  down
Shift+a          sprint  left
Shift+d          sprint  right

map: vi alternate
---
k               move    up
j               move    down
h               move    left
l               move    right
Control         crouch
Shift+k         sprint  up
Shift+j         sprint  down
Shift+h         sprint  left
Shift+l         sprint  right

mode: menu
==========
map: default
---
ArrowUp         move    up
ArrowDown       move    down
ArrowLeft       move    left
ArrowRight      move    right
Enter           select

mode: raw
==========
map: pass`;

    }

    private loadConfig(): void {
        this.configStatus.textContent = '';
        try {
            // Load the new config
            this.inputManager.loadConfig(this.configTextarea.value);
            
            // Update selectors
            this.updateModeSelect();
            this.updateMapSelect();
            this.updateActionBindings();
            
            const errors = this.inputManager.getConfigErrors();
            if (errors.length > 0) {
                this.configStatus.textContent = 'Configuration loaded with warnings:\n' + 
                    errors.map(e => `${e.type}: ${e.message}`).join('\n');
            } else {
                const stats = this.inputManager.getConfigStats();
                const modeList = stats.modes
                    .map((m: { name: string, mapCount: number }) => 
                        `  ${m.name} (${m.mapCount} maps)`)
                    .join('\n');
                
                this.configStatus.textContent = 
                    'Configuration loaded successfully\n\n' +
                    'Modes loaded:\n' +
                    modeList + '\n\n' +
                    `Total key mappings: ${stats.totalMappings}\n` +
                    `Errors: ${stats.errorCount}\n` +
                    `Warnings: ${stats.warningCount}`;
            }
        } catch (e: any) {
            this.configStatus.textContent = `Error loading configuration: ${e.message}`;
        }
    }

    private clearLogs(): void {
        this.inputLog.textContent = '';
        this.actionLog.textContent = '';
    }

    private setupEventListeners(): void {
        document.addEventListener('keydown', (e) => {
            this.logInput('keydown', e);
        });
        document.addEventListener('keyup', (e) => {
            this.logInput('keyup', e);
        });

        // Register action callback once here, not in loadConfig
        this.inputManager.registerCallback((eventType, action, parameters, modifiers) => {
            this.logAction(eventType, action, parameters, modifiers);
            return false; // Don't stop propagation
        }, 0);
    }

    private logInput(type: string, event: KeyboardEvent): void {
        const modifiers = [
            event.ctrlKey ? 'ctrl' : '',
            event.shiftKey ? 'shift' : '',
            event.altKey ? 'alt' : '',
            event.metaKey ? 'meta' : ''
        ].filter(Boolean).join(' ');

        const columns = [
            type.padEnd(8),                    // 'keydown ' or 'keyup   '
            event.key.padEnd(12),              // key name
            modifiers
        ];
        
        const log = columns.join(' ');
        this.appendToLog(this.inputLog, log);
    }

    private logAction(eventType: string, action: string, parameters: string[], modifiers: Record<string, boolean>): void {
        const modifierStr = Object.entries(modifiers)
            .filter(([_, value]) => value)
            .map(([key]) => key)
            .join(' ');

        const columns = [
            eventType.padEnd(6),               // 'down  ' or 'up    '
            action.padEnd(15),                 // action name
            `[${parameters.join(', ')}]`.padEnd(20),
            modifierStr
        ];
        
        const log = columns.join(' ');
        this.appendToLog(this.actionLog, log);
    }

    private appendToLog(element: HTMLPreElement, message: string): void {
        element.textContent = `${message}\n${element.textContent}`;
        if (element.textContent.length > 10000) {
            element.textContent = element.textContent.substring(0, 10000);
        }
    }

    public async run(): Promise<void> {
        // Initial load of default config
        this.loadConfig();
    }

    private changeMode(): void {
        const selectedMode = this.modeSelect.value;
        if (selectedMode) {
            this.inputManager.setMode(selectedMode);
            this.updateMapSelect();
            this.updateActionBindings();
        }
    }

    private updateActionBindings(): void {
        if (!this.inputManager.getCurrentMode()) {
            this.actionBindings.textContent = 'No mode selected';
            return;
        }

        const mode = this.inputManager.getCurrentMode();
        const actions = this.inputManager.listActions(mode);
        const currentMap = this.mapSelect.value;
        
        const lines = actions.map(action => {
            const allKeys = this.inputManager.listKeysForAction(mode, action);
            // Only show keys that don't have a map specification or match current map
            const currentMapKeys = allKeys.filter(key => 
                !key.includes('(') || key.includes(`(${currentMap})`));
            
            // If there are no keys for this action in the current map, skip it
            if (currentMapKeys.length === 0) {
                return null;
            }

            // Remove the map specification from the keys since we're only showing current map
            const cleanKeys = currentMapKeys.map(key => key.split(' (')[0]);
            return `${action.padEnd(15)} ${cleanKeys.join(', ')}`;
        }).filter(Boolean); // Remove null entries

        this.actionBindings.textContent = lines.join('\n');
    }
} 