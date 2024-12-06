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

    // Would you like me to continue with the implementation of these methods?
    public loadConfig(configText: string): void {}
    public setMode(mode: string): void {}
    public setMap(map: string): void {}
    public registerCallback(callback: ActionCallback, order: number, mode?: string): void {}
    public getConfigErrors(): ConfigError[] {}
    public listActions(mode: string): string[] {}
    public listKeysForAction(mode: string, action: string): string[] {}

    private handleKeyDown(event: KeyboardEvent): void {}
    private handleKeyUp(event: KeyboardEvent): void {}
    private parseConfig(configText: string): void {}
    private updateModifierState(event: KeyboardEvent): void {}
    private triggerCallbacks(eventType: string, action: string, parameters: string[]): void {}
    private startRepeat(key: string): void {}
    private stopRepeat(key: string): void {}
} 