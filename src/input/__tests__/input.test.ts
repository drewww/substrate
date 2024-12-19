import { describe, beforeEach, it, expect, vi } from 'vitest';
import { InputManager } from '../input';

describe('InputManager', () => {
    let inputManager: InputManager;
    let mockAddEventListener: ReturnType<typeof vi.fn>;
    let mockSetInterval: ReturnType<typeof vi.fn>;
    let mockClearInterval: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockAddEventListener = vi.fn();
        mockSetInterval = vi.fn();
        mockClearInterval = vi.fn();

        inputManager = new InputManager({
            addEventListener: mockAddEventListener,
            setInterval: mockSetInterval,
            clearInterval: mockClearInterval
        });
    });

    describe('Configuration Parsing', () => {
        it('parses a basic mode and map configuration', () => {
            const config = `
                mode: game
                map: default default
                ---
                w move-up
                s move-down
                a move-left
                d move-right
                =====
            `;
            inputManager.loadConfig(config);
            expect(inputManager.getConfigErrors()).toHaveLength(0);
            expect(inputManager.getModes().game).toBeDefined();
            expect(inputManager.getModes().game.defaultMap).toBe('default');
        });

        it('handles pass-through mode correctly', () => {
            const config = `
                mode: system
                map: pass
                ---
                =====
            `;
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
                mode: game
                map: default
                ---
                w move-up
                Control+s save
                Shift+Alt+x quit
                =====
            `;
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
                map: default default
                ---
                w move-up
                s move-down
                =====
                mode: menu
                map: pass
                ---
                =====
            `;
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
        beforeEach(() => {
            // Use the standard WASD config
            const config = `
                mode: game
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
                =====
            `;
            inputManager.loadConfig(config);
            inputManager.setMode('game');
        });

        it('registers keyboard event listeners', () => {
            expect(mockAddEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
            expect(mockAddEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
        });

        it('handles key down events', () => {
            const [[, keydownHandler]] = mockAddEventListener.mock.calls.filter(
                ([eventName]) => eventName === 'keydown'
            );
            
            const mockEvent = {
                type: 'keydown',
                key: 'w',
                code: 'KeyW',
                keyCode: 87,
                ctrlKey: false,
                shiftKey: false,
                altKey: false,
                metaKey: false,
                repeat: false,
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                getModifierState: (mod: string) => false
            } as unknown as KeyboardEvent;

            keydownHandler(mockEvent);

            // Now we can test that the 'move up' action was triggered
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });
}); 