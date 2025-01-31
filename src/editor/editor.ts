import { World } from '../world/world';
import { EditorDisplay } from './editor-display';
import { EditorStateManager } from './editor-state';
import { Point } from '../types';
import { EditorRenderer } from './editor-renderer';
import { createPlayerEntity, createWallEntity } from './templates/wall';
import { Entity } from '../entity/entity';
import { logger } from '../util/logger';
import { SymbolComponent } from '../entity/components/symbol-component';
import { Component } from '../entity/component';
import { ComponentRegistry } from '../entity/component-registry';


const CANVAS_ID = 'editor-canvas';

export class Editor {
    private world: World;
    private renderer: EditorRenderer;
    private display: EditorDisplay;
    private state: EditorStateManager;

    constructor(width: number, height: number) {
        // Create world
        this.world = new World(width, height);
        
        // Create display
        this.display = new EditorDisplay({
            elementId: CANVAS_ID,
            cellWidth: 20,
            cellHeight: 20,
            worldWidth: width,
            worldHeight: height,
            viewportWidth: width,
            viewportHeight: height
        });

        // Create state manager
        this.state = new EditorStateManager();

        // Setup renderer
        this.renderer = new EditorRenderer(this.world, this.display.getDisplay());

        // Setup event handlers
        this.setupEventHandlers();

        // Setup palette
        this.setupPalette();

        // Make editor available globally for callbacks
        (window as any).editor = this;
    }

    private setupEventHandlers(): void {
        // const displayElement = this.display.getDisplay().getRenderCanvas();
        // const displayElement = document.getElementById(CANVAS_ID);

        // if(displayElement) {
        //     displayElement.addEventListener('click', (e: MouseEvent) => this.handleClick(e));
        //     displayElement.addEventListener('contextmenu', (e: MouseEvent) => {
        //         e.preventDefault(); // Prevent context menu immediately
        //         this.handleRightClick(e);
        //     });
        // }

        // Add hover handler
        this.display.getDisplay().onCellHover((point: Point | null) => {
            this.renderer.hoverCell(point);
        });

        this.display.getDisplay().onCellClick((point: Point | null) => {
            this.handleCellClick(point);
        });

        this.display.getDisplay().onCellRightClick((point: Point | null) => {
            this.handleRightClick(point);
        });
    }

    private setupPalette(): void {
        const entityPalette = document.getElementById('entity-palette');
        if (!entityPalette) return;

        // Add wall button
        // TODO this is bad, eventually we'll need some data structure to load from that describes all available palette items
        // in a systematic way. Ideally just render the component?? 
        const wallButton = document.createElement('button');
        wallButton.textContent = 'Wall';
        wallButton.addEventListener('click', () => {
            this.state.setClipboard(createWallEntity());
        });
        entityPalette.appendChild(wallButton);

        const playerButton = document.createElement('button');
        playerButton.textContent = 'Player';
        playerButton.addEventListener('click', () => {
            this.state.setClipboard(createPlayerEntity());
        });
        entityPalette.appendChild(playerButton);


    }


    private handleRightClick(point: Point | null): void {
        if(!point) return;
        
        logger.info('Right click', point);

        if (this.state.getClipboard()) {
            this.placeEntity(point);
        }
    }

    private handleCellClick(point: Point | null): void {
        if(!point) return;

        this.state.setSelectedCell(point);
        this.renderer.highlightCell(point);

        // Get entities at this position
        const entities = this.world.getEntitiesAt(point);
        
        // Sort by z-index (if they have symbol components)
        const sortedEntities = entities.sort((a, b) => {
            const symbolA = a.getComponent('symbol') as SymbolComponent;
            const symbolB = b.getComponent('symbol') as SymbolComponent;
            const zIndexA = symbolA ? symbolA.zIndex : 0;
            const zIndexB = symbolB ? symbolB.zIndex : 0;
            return zIndexB - zIndexA; // Higher z-index first
        });

        // Update entity panel
        this.updateEntityPanel(sortedEntities);
    }

    private updateEntityPanel(entities: Entity[]): void {
        const panel = document.getElementById('entity-details');
        if (!panel) return;

        if (entities.length === 0) {
            panel.innerHTML = 'No entities in this cell';
            return;
        }

        let html = '<div class="entity-list">';
        
        entities.forEach((entity, index) => {
            html += `
                <div class="entity-item">
                    <div class="entity-header">
                        <span>Entity ${entity.getId()}</span>
                        <div class="entity-controls">
                            <button onclick="window.editor.copyEntity('${entity.getId()}')">Copy</button>
                            <button onclick="window.editor.deleteEntity('${entity.getId()}')">Delete</button>
                        </div>
                    </div>
                    <div class="components">
                        ${this.renderComponentsList(entity)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        panel.innerHTML = html;
    }

    private renderComponentsList(entity: Entity): string {
        const components = entity.getComponents();
        
        // Separate components into simple (just type) and complex (has properties)
        const simpleComponents: Component[] = [];
        const complexComponents: Component[] = [];
        
        components.forEach(component => {
            const serialized = component.serialize();
            // If component only has 'type' property, it's simple
            if (Object.keys(serialized).length === 1) {
                simpleComponents.push(component);
            } else {
                complexComponents.push(component);
            }
        });

        let html = '<div class="component-list">';
        
        // Render complex components first
        complexComponents.forEach(component => {
            const componentData = JSON.stringify(component.serialize(), null, 2);
            html += `
                <div class="component-item">
                    <div class="component-header">
                        ${component.type}
                        <div class="component-controls" style="display: none;">
                            <button onclick="window.editor.saveComponent('${entity.getId()}', '${component.type}', this)">Save</button>
                            <button onclick="window.editor.resetComponent(this)">Reset</button>
                        </div>
                    </div>
                    <textarea 
                        class="component-data"
                        onfocus="this.parentElement.querySelector('.component-controls').style.display = 'flex'"
                        oninput="this.dataset.edited = 'true'"
                        onblur="if (!this.dataset.edited) this.parentElement.querySelector('.component-controls').style.display = 'none'"
                    >${componentData}</textarea>
                </div>
            `;
        });

        // Render simple components as tags
        if (simpleComponents.length > 0) {
            html += '<div class="simple-components">';
            simpleComponents.forEach(component => {
                html += `<div class="simple-component">${component.type}</div>`;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    public copyEntity(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (entity) {
            this.state.setClipboard(entity);
            logger.info('Copied entity to clipboard:', entityId);
        }
    }

    public deleteEntity(entityId: string): void {
        this.world.removeEntity(entityId);
        
        // Refresh the panel if we're still looking at the same cell
        const selectedCell = this.state.getState().selectedCell;
        if (selectedCell) {
            const entities = this.world.getEntitiesAt(selectedCell);
            this.updateEntityPanel(entities);
        }
    }

    private placeEntity(point: Point): void {
        const clipboard = this.state.getClipboard();
        if (!clipboard) return;

        // Create a new entity from the clipboard
        // const entity = new Entity();
        // clipboard.getComponents().forEach(component => {
        //     entity.setComponent(component);
        // });

        if(clipboard instanceof Entity) {
            // Set position
            const entity = clipboard.clone();
            entity.setPosition(point.x, point.y);
            this.world.addEntity(entity);
        } else {
            logger.warn("Component clipboard not implemented.");
        }
    }

    public update(timestamp: number): void {
        this.renderer.update(timestamp);
    }

    public getWorld(): World {
        return this.world;
    }

    public getDisplay(): EditorDisplay {
        return this.display;
    }

    public saveComponent(entityId: string, componentType: string, button: HTMLButtonElement): void {
        logger.info("Saving component: ", entityId, componentType);
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        const textarea = button.closest('.component-item')?.querySelector('textarea');
        if (!textarea) return;

        try {
            const data = JSON.parse(textarea.value);
            logger.info("Updating component: ", data);
            const component = ComponentRegistry.fromJSON(data);
            entity.setComponent(component);
            logger.info('Component updated:', componentType);
            
            // Refresh the panel
            const selectedCell = this.state.getState().selectedCell;
            if (selectedCell) {
                const entities = this.world.getEntitiesAt(selectedCell);
                this.updateEntityPanel(entities);
            }
        } catch (e) {
            logger.error('Failed to parse component JSON:', e);
            alert('Invalid JSON format');
        }
    }

    public resetComponent(button: HTMLButtonElement): void {
        const textarea = button.closest('.component-item')?.querySelector('textarea');
        if (!textarea) return;
        
        const originalValue = textarea.defaultValue;
        textarea.value = originalValue;
        textarea.dataset.edited = 'false';
        button.closest('.component-controls')!.style.display = 'none';
    }
}

// Make editor available to window for button callbacks
declare global {
    interface Window {
        editor: Editor;
    }
} 