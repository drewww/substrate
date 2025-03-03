import { Editor } from './editor';

class BasicTestGame {
    private editor: Editor;

    constructor() {
        // Create a 30x20 editor
        this.editor = new Editor(12, 12);
        
        // Set up tool buttons
        this.setupTools();
        
        // Set up palettes
        this.setupPalettes();
        
        // Start update loop
        this.startUpdateLoop();
    }

    private setupTools(): void {
        const pointerTool = document.getElementById('pointer-tool');
        const exportTool = document.getElementById('export-tool');

        if (pointerTool) {
            pointerTool.addEventListener('click', () => {
                // TODO: Implement pointer tool selection
            });
        }

        if (exportTool) {
            exportTool.addEventListener('click', () => {
                this.exportLevel();
            });
        }
    }

    private setupPalettes(): void {
        const entityPalette = document.getElementById('entity-palette');
        const componentPalette = document.getElementById('component-palette');

        // Add some test entities
        // if (entityPalette) {
        //     const entities = ['Wall', 'Floor', 'Player', 'Monster'];
        //     entities.forEach(entity => {
        //         const button = document.createElement('button');
        //         button.textContent = entity;
        //         button.addEventListener('click', () => {
        //             // TODO: Handle entity selection
        //         });
        //         entityPalette.appendChild(button);
        //     });
        // }

        // Add basic components
        if (componentPalette) {
            const components = ['Opaque', 'Symbol', 'Followable', 'Following', 'Facing', 'Impassable'];
            components.forEach(component => {
                const button = document.createElement('button');
                button.textContent = component;
                button.addEventListener('click', () => {
                    // TODO: Handle component selection
                });
                componentPalette.appendChild(button);
            });
        }
    }

    private exportLevel(): void {
        const level = {
            // TODO: Implement level export
            entities: [],
            width: 30,
            height: 20
        };

        const blob = new Blob([JSON.stringify(level, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'level.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private startUpdateLoop(): void {
        const update = (timestamp: number) => {
            this.editor.update(timestamp);
            requestAnimationFrame(update);
        };
        requestAnimationFrame(update);
    }
}

// Initialize when the document is loaded
function init() {
    new BasicTestGame();
}

document.addEventListener('DOMContentLoaded', init);