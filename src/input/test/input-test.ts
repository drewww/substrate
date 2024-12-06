import { InputManager } from '../input';

export class InputTest {
    private inputManager: InputManager;
    private configTextarea: HTMLTextAreaElement;
    private configStatus: HTMLPreElement;
    private inputLog: HTMLPreElement;
    private actionLog: HTMLPreElement;
    
    constructor() {
        this.inputManager = new InputManager();
        
        // Get references to DOM elements
        this.configTextarea = document.getElementById('config') as HTMLTextAreaElement;
        this.configStatus = document.getElementById('config-status') as HTMLPreElement;
        this.inputLog = document.getElementById('input-log') as HTMLPreElement;
        this.actionLog = document.getElementById('action-log') as HTMLPreElement;

        // Set default config
        this.configTextarea.value = this.getDefaultConfig();

        // Setup event listeners
        document.getElementById('load-config')!.onclick = () => this.loadConfig();
        this.setupEventListeners();
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

    private getDefaultConfig(): string {
        return `mode: game
map: wasd default
---
w,ArrowUp        move    up
s,ArrowDown      move    down
a,ArrowLeft      move    left
d,ArrowRight     move    right
Control          crouch
Shift+a          sprint-left`;
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

    private logInput(type: string, event: KeyboardEvent): void {
        const log = `${type}: ${event.key} (ctrl: ${event.ctrlKey}, shift: ${event.shiftKey}, alt: ${event.altKey}, meta: ${event.metaKey})`;
        this.appendToLog(this.inputLog, log);
    }

    private logAction(eventType: string, action: string, parameters: string[], modifiers: Record<string, boolean>): void {
        const log = `${eventType}.${action} - params: [${parameters.join(', ')}], modifiers: ${JSON.stringify(modifiers)}`;
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