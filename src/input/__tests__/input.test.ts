import { describe, beforeEach, it, expect, vi, afterEach } from 'vitest';
import { InputManager } from '../input';

describe('InputManager', () => {
    let inputManager: InputManager;
    let mockAddEventListener: ReturnType<typeof vi.fn>;
    let mockSetInterval: ReturnType<typeof vi.fn>;
    let mockClearInterval: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        mockAddEventListener = vi.fn();
        mockSetInterval = vi.fn();
        mockClearInterval = vi.fn();
        
        inputManager = new InputManager({
            addEventListener: mockAddEventListener,
            setInterval: mockSetInterval,
            clearInterval: mockClearInterval
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Helper function to safely get event handler
    const getEventHandler = (eventName: string): ((event: KeyboardEvent) => void) => {
        const handler = mockAddEventListener.mock.calls
            .find(([event]) => event === eventName)?.[1];
        
        if (!handler) {
            throw new Error(`No handler found for ${eventName} event`);
        }
        
        return handler as (event: KeyboardEvent) => void;
    };

    describe('Configuration Parsing', () => {
        it('parses a basic mode and map configuration', () => {
            const config = `
                mode: game
                ==========
                map: default
                ---
                w move up
                s move down`;
            inputManager.loadConfig(config);
            expect(inputManager.getConfigErrors()).toHaveLength(0);
            expect(inputManager.getModes().game).toBeDefined();
            expect(inputManager.getModes().game.defaultMap).toBe('default');
        });

        it('handles pass-through mode correctly', () => {
            const config = `
                mode: system
                ==========
                map: pass
                ---
                # No key mappings allowed here`;
            inputManager.loadConfig(config);
            expect(inputManager.getConfigErrors()).toHaveLength(0);
            expect(inputManager.listActions('system')).toEqual(['key']);
        });

        it('validates mode identifiers', () => {
            const config = `
                mode: 123-invalid
                map: default default
                ---
                w move-up
                =====
            `;
            inputManager.loadConfig(config);
            const errors = inputManager.getConfigErrors();
            expect(errors.some(e => e.message.includes('Invalid mode identifier'))).toBe(true);
        });

        it('validates map identifiers', () => {
            const config = `
                mode: game
                map: invalid!map
                ---
                w move-up
                =====
            `;
            inputManager.loadConfig(config);
            const errors = inputManager.getConfigErrors();
            expect(errors.some(e => e.message.includes('Invalid map identifier'))).toBe(true);
        });

        it('detects multiple default maps', () => {
            const config = `
                mode: game
                map: map1 default
                map: map2 default
                ---
                w move-up
                =====
            `;
            inputManager.loadConfig(config);
            const warnings = inputManager.getConfigErrors().filter(e => e.type === 'warning');
            expect(warnings.some(w => w.message.includes('Multiple default maps'))).toBe(true);
        });
    });

    describe('Key Mapping Validation', () => {
        it('validates basic key mappings', () => {
            const config = `
                mode: test
                ==========
                map: default
                ---
                w move up
                Control+s move down
                Shift+Alt+x action param1 param2`;
            inputManager.loadConfig(config);
            expect(inputManager.getConfigErrors()).toHaveLength(0);
        });

        it('rejects invalid modifier keys', () => {
            const config = `
                mode: game
                map: default
                ---
                Invalid+w move-up
                =====
            `;
            inputManager.loadConfig(config);
            const errors = inputManager.getConfigErrors();
            expect(errors.some(e => e.message.includes('Invalid modifier key'))).toBe(true);
        });

        it('validates action names', () => {
            const config = `
                mode: game
                map: default
                ---
                w invalid!action
                =====
            `;
            inputManager.loadConfig(config);
            const errors = inputManager.getConfigErrors();
            expect(errors.some(e => e.message.includes('Invalid action name'))).toBe(true);
        });
    });

    describe('Mode and Map Management', () => {
        beforeEach(() => {
            // Set up a valid configuration first
            const config = `
                mode: game
                map: default default
                map: combat
                ---
                w move-up
                s move-down
                =====
                
                mode: menu
                map: default default
                ---
                up select-up
                down select-down
                =====
            `;
            inputManager.loadConfig(config);
        });

        it('can set and get current mode', () => {
            inputManager.setMode('game');
            expect(inputManager.getCurrentMode()).toBe('game');
            
            inputManager.setMode('menu');
            expect(inputManager.getCurrentMode()).toBe('menu');
        });

        it('throws on invalid mode', () => {
            expect(() => inputManager.setMode('nonexistent')).toThrow();
        });

        it('can list available maps for current mode', () => {
            inputManager.setMode('game');
            const maps = inputManager.getAvailableMaps();
            expect(maps).toContain('default');
            expect(maps).toContain('combat');
        });

        it('can set specific map', () => {
            inputManager.setMode('game');
            inputManager.setMap('combat');
            // We can verify the map was set by checking if key bindings changed
            // or by checking if actions are processed correctly
        });
    });

    describe('Statistics and Reporting', () => {
        it('provides configuration statistics', () => {
            const config = `
                mode: game
                ==========
                map: default
                ---
                w move up
                s move down

                mode: system
                ==========
                map: pass`;
            inputManager.loadConfig(config);
            const stats = inputManager.getConfigStats();
            
            expect(stats.modes).toHaveLength(2);
            expect(stats.totalMappings).toBe(3); // 2 game mappings + 1 pass-through
            expect(stats.errorCount).toBe(0);
            expect(stats.warningCount).toBe(0);
        });

        it('lists all actions for a mode', () => {
            const config = `
                mode: game
                map: default
                ---
                w move-up
                s move-down
                a move-left
                d move-right
                =====
            `;
            inputManager.loadConfig(config);
            const actions = inputManager.listActions('game');
            expect(actions).toContain('move-up');
            expect(actions).toContain('move-down');
            expect(actions).toContain('move-left');
            expect(actions).toContain('move-right');
        });
    });

    describe('Event Handling', () => {
        let mockCallback: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);
            
            // Use a simple config for testing
            const config = `
                mode: test
                ==========
                map: default
                ---
                w move up
                Shift+x special param1 param2
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('test');
        });

        it('handles basic keydown/keyup cycle', () => {
            const keydownHandler = getEventHandler('keydown');
            const keyupHandler = getEventHandler('keyup');
            
            // Test keydown
            const downEvent = {
                type: 'keydown',
                key: 'w',
                code: 'KeyW',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keydownHandler(downEvent);

            expect(mockCallback).toHaveBeenCalledWith('down', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(downEvent.preventDefault).toHaveBeenCalled();
            expect(inputManager['activeKeys'].has('w')).toBe(true);

            // Clear mock for next test
            mockCallback.mockClear();

            // Test keyup
            const upEvent = {
                type: 'keyup',
                key: 'w',
                code: 'KeyW',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keyupHandler(upEvent);

            expect(mockCallback).toHaveBeenCalledWith('up', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(false);
        });

        it('handles modifier key combinations', () => {
            const keydownHandler = getEventHandler('keydown');
            
            const event = {
                type: 'keydown',
                key: 'x',
                code: 'KeyX',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: true,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keydownHandler(event);

            expect(mockCallback).toHaveBeenCalledWith('down', 'special', ['param1', 'param2'], {
                ctrl: false,
                shift: true,
                alt: false,
                meta: false
            });
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('ignores unbound keys', () => {
            const keydownHandler = getEventHandler('keydown');
            
            const event = {
                type: 'keydown',
                key: 'y',  // Not bound in our config
                code: 'KeyY',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keydownHandler(event);

            expect(mockCallback).not.toHaveBeenCalled();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('Repeat Key Handling', () => {
        it('triggers repeat events for held keys', async () => {
            const mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);
            
            const config = `
                mode: game
                map: default default
                ---
                w move up
                =====
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('game');

            // Mock setInterval to execute callback immediately
            mockSetInterval.mockImplementation((callback) => {
                callback();
                return 123;
            });

            const mockEvent = {
                key: 'w',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;
            
            const keydownHandler = getEventHandler('keydown');
            keydownHandler(mockEvent);

            // No need to wait since we're executing callback immediately
            expect(mockCallback).toHaveBeenCalledWith('repeat', 'move', ['up'], expect.any(Object));
        });
    });

    describe('Modifier Key Handling', () => {
        it('handles complex modifier combinations', () => {
            const config = `
                mode: test
                map: default default
                ---
                Control+Shift+a action params
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('test');

            const mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);

            // Test with correct modifier combination
            const mockEvent = {
                key: 'a',
                ctrlKey: true,
                shiftKey: true,
                altKey: false,
                metaKey: false,
                preventDefault: vi.fn()
            } as unknown as KeyboardEvent;

            const keydownHandler = getEventHandler('keydown');
            keydownHandler(mockEvent);

            expect(mockCallback).toHaveBeenCalledWith('down', 'action', ['params'], expect.any(Object));
        });
    });

    describe('Mode and Map Changes', () => {
        it('clears active keys when changing maps', () => {
            let mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);
            
            // Config with multiple maps in one mode
            const config = `
                mode: test
                ==========
                map: map1 default
                ---
                w move up
                Shift+x special param1 param2
                =====
                map: map2
                ---
                w jump high
                Shift+x other param3 param4
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('test');

            const keydownHandler = getEventHandler('keydown');
            
            // Test keydown in first map
            const downEvent = {
                type: 'keydown',
                key: 'w',
                code: 'KeyW',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keydownHandler(downEvent);

            // Verify first map action triggered
            expect(mockCallback).toHaveBeenCalledWith('down', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(true);

            // Clear mock to track new calls
            mockCallback.mockClear();

            // Change map - should trigger key-up for active keys
            inputManager.setMap('map2');

            // Verify key-up was triggered for active key
            expect(mockCallback).toHaveBeenCalledWith('up', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(false);

            // Clear mock again
            mockCallback.mockClear();

            // Press same key in new map
            keydownHandler(downEvent);

            // Verify new map action triggered
            expect(mockCallback).toHaveBeenCalledWith('down', 'jump', ['high'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(true);
        });

        it('clears active keys when changing modes', () => {
            let mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);
            
            // Config with two modes
            const config = `
                mode: test1
                ==========
                map: default
                ---
                w move up
                Shift+x special param1 param2
                =====

                mode: test2
                ==========
                map: default
                ---
                w jump high
                Shift+x other param3 param4
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('test1');

            const keydownHandler = getEventHandler('keydown');
            
            // Test keydown in first mode
            const downEvent = {
                type: 'keydown',
                key: 'w',
                code: 'KeyW',
                preventDefault: vi.fn(),
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false
            } as unknown as KeyboardEvent;

            keydownHandler(downEvent);

            // Verify first mode action triggered
            expect(mockCallback).toHaveBeenCalledWith('down', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(true);

            // Clear mock to track new calls
            mockCallback.mockClear();

            // Change mode - should trigger key-up for active keys
            inputManager.setMode('test2');

            // Verify key-up was triggered for active key
            expect(mockCallback).toHaveBeenCalledWith('up', 'move', ['up'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(false);

            // Clear mock again
            mockCallback.mockClear();

            // Press same key in new mode
            keydownHandler(downEvent);

            // Verify new mode action triggered
            expect(mockCallback).toHaveBeenCalledWith('down', 'jump', ['high'], {
                ctrl: false,
                shift: false,
                alt: false,
                meta: false
            });
            expect(inputManager['activeKeys'].has('w')).toBe(true);
        });
    });

    describe('Pass-through Mode', () => {
        it('forwards all keys in pass-through mode', () => {
            const config = `
                mode: passthrough
                map: pass
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('passthrough');

            const mockCallback = vi.fn();
            inputManager.registerCallback(mockCallback, 0);

            // Test with any key
            const mockEvent = {
                key: 'x',
                preventDefault: vi.fn()
            } as unknown as KeyboardEvent;

            const keydownHandler = getEventHandler('keydown');
            keydownHandler(mockEvent);

            expect(mockCallback).toHaveBeenCalledWith('down', 'key', ['x'], expect.any(Object));
        });
    });

    describe('Error Handling', () => {
        it('handles missing mode/map gracefully', () => {
            expect(() => inputManager.setMode('nonexistent')).toThrow();
            expect(() => inputManager.setMap('nonexistent')).toThrow();
        });

        it('validates action names', () => {
            const config = `
                mode: test
                map: default default
                ---
                w invalid!action
            `;
            inputManager.loadConfig(config);
            const errors = inputManager.getConfigErrors();
            expect(errors.some(e => e.message.includes('Invalid action name'))).toBe(true);
        });
    });
}); 