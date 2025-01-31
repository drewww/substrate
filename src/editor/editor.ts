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
import { MouseTransition } from '../display/display';


const CANVAS_ID = 'editor-canvas';

export class Editor {
    private world: World;
    private renderer: EditorRenderer;
    private display: EditorDisplay;
    private state: EditorStateManager;
    private isRightMouseDown: boolean = false;
    private lastDragCell: Point | null = null;
    private isLeftMouseDown: boolean = false;
    private selectedCells: Point[] = [];
    private currentTool: 'pointer' | 'area' = 'pointer';
    private areaStartCell: Point | null = null;

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

        // Add keyboard handlers
        this.setupKeyboardHandlers();
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

        // Add tool button handlers
        const pointerButton = document.getElementById('pointer-tool');
        const areaButton = document.getElementById('area-tool');
        
        if (pointerButton) {
            pointerButton.addEventListener('click', () => {
                this.currentTool = 'pointer';
                pointerButton.classList.add('active');
                if (areaButton) areaButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });
        }
        
        if (areaButton) {
            areaButton.addEventListener('click', () => {
                this.currentTool = 'area';
                areaButton.classList.add('active');
                if (pointerButton) pointerButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });
        }

        // Add hover handler
        this.display.getDisplay().onCellHover((point: Point | null) => {
            this.renderer.hoverCell(point);
            
            if (this.isLeftMouseDown && point && this.currentTool === 'area' && this.areaStartCell) {
                // Calculate area selection
                const newSelection = this.getCellsInArea(this.areaStartCell, point);
                if (JSON.stringify(newSelection) !== JSON.stringify(this.selectedCells)) {
                    this.selectedCells = newSelection;
                    this.renderer.highlightCells(this.selectedCells);
                    this.updateEntityPanel(this.getEntitiesInSelectedCells());
                }
            } else if (this.isLeftMouseDown && point && this.currentTool === 'pointer') {
                // Drag-select behavior
                if (!this.selectedCells.some(p => p.x === point.x && p.y === point.y)) {
                    this.selectedCells.push(point);
                    this.renderer.highlightCells(this.selectedCells);
                    this.updateEntityPanel(this.getEntitiesInSelectedCells());
                }
            }
            
            // Existing right-click drag behavior
            if (this.isRightMouseDown && point) {
                if (!this.lastDragCell || 
                    this.lastDragCell.x !== point.x || 
                    this.lastDragCell.y !== point.y) {
                    this.handleRightClick(point);
                    this.lastDragCell = point;
                }
            }
        });

        this.display.getDisplay().onCellClick((point: Point | null, transition: MouseTransition, event: MouseEvent) => {
            if (transition === 'down') {
                this.isLeftMouseDown = true;
                if (!event.shiftKey) {
                    this.selectedCells = [];
                    this.renderer.clearHighlights();
                }
                if (point) {
                    if (this.currentTool === 'area') {
                        this.areaStartCell = point;
                        this.selectedCells = [point];
                    } else {
                        if (!this.selectedCells.some(p => p.x === point.x && p.y === point.y)) {
                            this.selectedCells.push(point);
                        }
                    }
                    this.renderer.highlightCells(this.selectedCells);
                    this.handleCellClick(point, event.shiftKey);
                }
            } else {
                this.isLeftMouseDown = false;
                this.areaStartCell = null;
            }
        });

        this.display.getDisplay().onCellRightClick((point: Point | null) => {
            this.isRightMouseDown = true;
            this.lastDragCell = point;
            this.handleRightClick(point);
        });

        // Add mouse up handler to window to catch releases outside the canvas
        window.addEventListener('mouseup', (e: MouseEvent) => {
            if (e.button === 2) { // Right mouse button
                this.isRightMouseDown = false;
                this.lastDragCell = null;
            } else if (e.button === 0) { // Left mouse button
                this.isLeftMouseDown = false;
                this.areaStartCell = null;
            }
        });

        // Prevent context menu from appearing
        document.addEventListener('contextmenu', (e: Event) => {
            e.preventDefault();
        });

        // Add fill button handler
        const fillButton = document.getElementById('fill-tool');
        if (fillButton) {
            fillButton.addEventListener('click', () => this.handleFill());
        }
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
            this.state.setEntityClipboard(createWallEntity());
        });
        entityPalette.appendChild(wallButton);

        const playerButton = document.createElement('button');
        playerButton.textContent = 'Player';
        playerButton.addEventListener('click', () => {
            this.state.setEntityClipboard(createPlayerEntity());
        });
        entityPalette.appendChild(playerButton);
    }

    private getEntitiesSortedByZIndex(entities: Entity[]): Entity[] {
        return entities.sort((a, b) => {
            const symbolA = a.getComponent('symbol') as SymbolComponent;
            const symbolB = b.getComponent('symbol') as SymbolComponent;
            const zIndexA = symbolA ? symbolA.zIndex : 0;
            const zIndexB = symbolB ? symbolB.zIndex : 0;
            return zIndexB - zIndexA; // Higher z-index first
        });
    }

    private handleRightClick(point: Point | null): void {
        if(!point) return;
        
        logger.info('Right click', point);

        const clipboard = this.state.getClipboard();
        if (clipboard.type === 'entity' && clipboard.entity) {
            // Check if there's a matching entity at this position
            const entities = this.world.getEntitiesAt(point);
            const sortedEntities = this.getEntitiesSortedByZIndex(entities);
            
            if (sortedEntities.length > 0) {
                const topEntity = sortedEntities[0];
                if (this.entitiesHaveSameComponents(topEntity, clipboard.entity)) {
                    // Remove the matching entity
                    this.world.removeEntity(topEntity.getId());
                    logger.info('Removed matching entity');
                    return;
                }
            }
            
            // If no match found or no entities, place the new entity
            this.placeEntity(point);
        } else if (clipboard.type === 'components' && clipboard.components?.length) {
            // Get the topmost entity at this position
            const entities = this.world.getEntitiesAt(point);
            if (entities.length > 0) {
                const sortedEntities = this.getEntitiesSortedByZIndex(entities);
                
                // Paste component to topmost entity
                const topEntity = sortedEntities[0];
                const component = clipboard.components[0].clone();
                topEntity.setComponent(component);
                logger.info('Pasted component:', component.type);

                // Refresh panel if this cell is selected
                const selectedCell = this.state.getState().selectedCell;
                if (selectedCell && selectedCell.x === point.x && selectedCell.y === point.y) {
                    this.updateEntityPanel(sortedEntities);
                }
            }
        }
    }

    private entitiesHaveSameComponents(entity1: Entity, entity2: Entity): boolean {
        const components1 = entity1.getComponents();
        const components2 = entity2.getComponents();

        if (components1.length !== components2.length) {
            return false;
        }

        // Sort components by type for consistent comparison
        const sortedComponents1 = components1.sort((a, b) => a.type.localeCompare(b.type));
        const sortedComponents2 = components2.sort((a, b) => a.type.localeCompare(b.type));

        // Compare each component
        return sortedComponents1.every((comp1, index) => {
            const comp2 = sortedComponents2[index];
            
            // First check if types match
            if (comp1.type !== comp2.type) {
                return false;
            }

            // Deep compare the serialized components
            const serial1 = comp1.serialize();
            const serial2 = comp2.serialize();
            return JSON.stringify(serial1) === JSON.stringify(serial2);
        });
    }

    private handleCellClick(point: Point | null, isMultiSelect: boolean = false): void {
        if (!point) return;

        if (!isMultiSelect) {
            this.selectedCells = [];
            this.renderer.clearHighlights();
        }

        // Add the point to selection if it's not already there
        if (!this.selectedCells.some(p => p.x === point.x && p.y === point.y)) {
            this.selectedCells.push(point);
        }

        this.state.setSelectedCell(point);
        this.renderer.highlightCells(this.selectedCells);

        // Update entity panel with all selected entities
        this.updateEntityPanel(this.getEntitiesInSelectedCells());
    }

    private updateEntityPanel(entities: Entity[]): void {
        const panel = document.getElementById('entity-details');
        if (!panel) return;

        if (entities.length === 0) {
            panel.innerHTML = 'No entities selected';
            return;
        }

        let html = '<div class="entity-list">';
        
        // Add delete button for multi-select
        if (this.selectedCells.length > 0) {
            html += `
                <div class="multi-select-header">
                    <span>${entities.length} entities in ${this.selectedCells.length} cells</span>
                    <button class="icon-button" title="Delete All Selected" onclick="window.editor.deleteSelectedEntities()">🗑️</button>
                </div>
            `;
        }
        
        entities.forEach(entity => {
            const components = entity.getComponents();
            html += `
                <div class="entity-item">
                    <div class="entity-header">
                        <span>Entity ${entity.getId()}</span>
                    </div>
                    <div class="component-list">
                        ${components.map(comp => `<div class="simple-component">${comp.type}</div>`).join('')}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        panel.innerHTML = html;
    }

    public copyEntity(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (entity) {
            this.state.setEntityClipboard(entity);
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
        if (clipboard.type !== 'entity' || !clipboard.entity) return;

        // Create a new entity from the clipboard
        const entity = clipboard.entity.clone();
        entity.setPosition(point.x, point.y);
        this.world.addEntity(entity);
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
        const controls = button.closest('.component-controls');
        if (controls && controls instanceof HTMLElement) {
            controls.style.display = 'none';
        }
    }

    public copyComponent(entityId: string, componentType: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        const component = entity.getComponent(componentType);
        if (component) {
            // Store in clipboard for later pasting
            this.state.setComponentClipboard([component]);
            logger.info('Copied component to clipboard:', componentType);
        }
    }

    public deleteComponent(entityId: string, componentType: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        entity.removeComponent(componentType);
        logger.info('Removed component:', componentType);
        
        // Refresh the panel
        const selectedCell = this.state.getState().selectedCell;
        if (selectedCell) {
            const entities = this.world.getEntitiesAt(selectedCell);
            this.updateEntityPanel(entities);
        }
    }

    public pasteComponent(entityId: string): void {
        const clipboard = this.state.getClipboard();
        if (clipboard.type !== 'components' || !clipboard.components?.length) {
            logger.warn('No component in clipboard');
            return;
        }

        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        // Clone the component before pasting
        const component = clipboard.components[0].clone();
        entity.setComponent(component);
        logger.info('Pasted component:', component.type);

        // Refresh the panel
        const selectedCell = this.state.getState().selectedCell;
        if (selectedCell) {
            const entities = this.world.getEntitiesAt(selectedCell);
            this.updateEntityPanel(entities);
        }
    }

    private setupKeyboardHandlers(): void {
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Delete all entities in all selected cells
                this.selectedCells.forEach(cell => {
                    const entities = this.world.getEntitiesAt(cell);
                    entities.forEach(entity => {
                        this.world.removeEntity(entity.getId());
                    });
                });
                logger.info('Deleted all entities in selected cells');
                
                // Update entity panel to show empty state
                this.updateEntityPanel([]);
            }
        });
    }

    // Add new method to handle delete button click
    public deleteSelectedEntities(): void {
        this.selectedCells.forEach(cell => {
            const entities = this.world.getEntitiesAt(cell);
            entities.forEach(entity => {
                this.world.removeEntity(entity.getId());
            });
        });
        logger.info('Deleted all entities in selected cells');
        
        // Clear selections after delete
        this.renderer.clearHighlights();
        this.selectedCells = [];
        
        // Update entity panel to show empty state
        this.updateEntityPanel([]);
    }

    private getCellsInArea(start: Point, end: Point): Point[] {
        const cells: Point[] = [];
        const minX = Math.min(start.x, end.x);
        const maxX = Math.max(start.x, end.x);
        const minY = Math.min(start.y, end.y);
        const maxY = Math.max(start.y, end.y);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                cells.push({ x, y });
            }
        }
        return cells;
    }

    private getEntitiesInSelectedCells(): Entity[] {
        const entities: Entity[] = [];
        this.selectedCells.forEach(cell => {
            entities.push(...this.world.getEntitiesAt(cell));
        });
        return entities;
    }

    private handleFill(): void {
        const clipboard = this.state.getClipboard();
        
        // Get cells to fill (either selected cells or entire world)
        const cellsToFill = this.selectedCells.length > 0 ? 
            this.selectedCells : 
            Array.from({ length: this.world.getWorldHeight() }, (_, y) => 
                Array.from({ length: this.world.getWorldWidth() }, (_, x) => ({ x, y }))
            ).flat();
        
        // Fill cells with clipboard contents
        cellsToFill.forEach(point => {
            if (clipboard.type === 'entity' && clipboard.entity) {
                const entity = clipboard.entity.clone();
                entity.setPosition(point.x, point.y);
                this.world.addEntity(entity);
            } else if (clipboard.type === 'components' && clipboard.components?.length) {
                const entities = this.world.getEntitiesAt(point);
                if (entities.length > 0) {
                    const sortedEntities = this.getEntitiesSortedByZIndex(entities);
                    const topEntity = sortedEntities[0];
                    const component = clipboard.components[0].clone();
                    topEntity.setComponent(component);
                }
            }
        });
        
        logger.info('Filled selected area with clipboard contents');
        
        // Clear selections after fill
        this.renderer.clearHighlights();
        this.selectedCells = [];
        
        // Update entity panel if needed
        const selectedCell = this.state.getState().selectedCell;
        if (selectedCell) {
            const entities = this.world.getEntitiesAt(selectedCell);
            this.updateEntityPanel(entities);
        }
    }
}

// Make editor available to window for button callbacks
declare global {
    interface Window {
        editor: Editor;
    }
} 