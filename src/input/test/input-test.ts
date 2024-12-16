import { InputManager } from '../input';

export class InputTest {
    private inputManager: InputManager;
    private configTextarea: HTMLTextAreaElement;
    private configStatus: HTMLPreElement;
    private inputLog: HTMLPreElement;
    private actionLog: HTMLPreElement;
    private mapSelect: HTMLSelectElement;
    
    constructor() {
        this.inputManager = new InputManager();
        
        // Get references to DOM elements
        this.configTextarea = document.getElementById('config') as HTMLTextAreaElement;
        this.configStatus = document.getElementById('config-status') as HTMLPreElement;
        this.inputLog = document.getElementById('input-log') as HTMLPreElement;
        this.actionLog = document.getElementById('action-log') as HTMLPreElement;
        this.mapSelect = document.getElementById('map-select') as HTMLSelectElement;

        // Set default config
        this.configTextarea.value = this.getDefaultConfig();

        // Setup event listeners
        document.getElementById('load-config')!.onclick = () => this.loadConfig();
        document.getElementById('clear-logs')!.onclick = () => this.clearLogs();
        this.mapSelect.onchange = () => this.changeMap();
        this.setupEventListeners();
    }

    private changeMap(): void {
        const selectedMap = this.mapSelect.value;
        if (selectedMap) {
            this.inputManager.setMap(selectedMap);
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
Shift+l         sprint  right`;
    }

    private loadConfig(): void {
        this.configStatus.textContent = '';
        try {
            // Create a fresh input manager
            this.inputManager = new InputManager();
            
            // Re-register our callback
            this.inputManager.registerCallback((eventType, action, parameters, modifiers) => {
                this.logAction(eventType, action, parameters, modifiers);
                return false; // Don't stop propagation
            }, 0);
            
            // Load the new config
            this.inputManager.loadConfig(this.configTextarea.value);
            
            // Update map selector
            this.updateMapSelect();
            
            const errors = this.inputManager.getConfigErrors();
            if (errors.length > 0) {
                this.configStatus.textContent = 'Configuration loaded with warnings:\n' + 
                    errors.map(e => `${e.type}: ${e.message}`).join('\n');
            } else {
                this.configStatus.textContent = 'Configuration loaded successfully';
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

        this.inputManager.registerCallback((eventType, action, parameters, modifiers) => {
            this.logAction(eventType, action, parameters, modifiers);
            return false; // Don't stop propagation
        }, 0);
    }

    private logInput(type: string, event: KeyboardEvent): void {
        const columns = [
            type.padEnd(8),                    // 'keydown ' or 'keyup   '
            event.key.padEnd(12),              // key name
            'ctrl:'  + (event.ctrlKey  ? 'Y' : 'N').padEnd(3),
            'shift:' + (event.shiftKey ? 'Y' : 'N').padEnd(3),
            'alt:'   + (event.altKey   ? 'Y' : 'N').padEnd(3),
            'meta:'  + (event.metaKey  ? 'Y' : 'N').padEnd(3)
        ];
        
        const log = columns.join(' ');
        this.appendToLog(this.inputLog, log);
    }

    private logAction(eventType: string, action: string, parameters: string[], modifiers: Record<string, boolean>): void {
        const modifierStr = Object.entries(modifiers)
            .map(([key, value]) => `${key}:${value ? 'Y' : 'N'}`)
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
} 