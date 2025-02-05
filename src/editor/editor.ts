import { World } from '../world/world';
import { Display } from '../display/display';
import { EditorStateManager } from './editor-state';
import { Direction, Point } from '../types';
import { EditorRenderer } from './editor-renderer';
import { Entity } from '../entity/entity';
import { logger } from '../util/logger';
import { SymbolComponent } from '../entity/components/symbol-component';
import { Component } from '../entity/component';
import { ComponentRegistry } from '../entity/component-registry';
import { MouseTransition } from '../display/display';

import '../entity/components/index.ts';
import '../game/test/components/index.ts';
import { JsonWorldGenerator } from '../world/generators/json-world-generator';

import basicPalette from './templates/basic-palette.json';
import { PaletteData } from './templates/formats';
import { FacingComponent } from '../entity/components/facing-component.ts';

const CANVAS_ID = 'editor-canvas';

export class Editor {
    private world: World;
    private renderer: EditorRenderer;
    private display: Display;
    private state: EditorStateManager;
    private isRightMouseDown: boolean = false;
    private lastDragCell: Point | null = null;
    private isLeftMouseDown: boolean = false;
    private selectedCells: Point[] = [];
    private currentTool: 'pointer' | 'area' | 'pan' | 'rotate' = 'pointer';
    private areaStartCell: Point | null = null;
    private paletteDisplay!: Display;
    private paletteRenderer!: EditorRenderer;
    private isPaletteLocked: boolean = true;
    private isPanning: boolean = false;
    private lastPanPoint: Point | null = null;

    constructor(width: number, height: number) {
        // Create world
        this.world = new World(width, height);
        
        // Create display with smaller viewport
        const viewportWidth = Math.floor(width * 0.75);  // 25% smaller
        const viewportHeight = Math.floor(height * 0.75);
        
        this.display = new Display({
            elementId: CANVAS_ID,
            cellWidth: 20,
            cellHeight: 20,
            worldWidth: width,
            worldHeight: height,
            viewportWidth: viewportWidth,
            viewportHeight: viewportHeight
        });

        // Create state manager
        this.state = new EditorStateManager();

        // Setup renderer
        this.renderer = new EditorRenderer(this.world, this.display);

        // Setup event handlers
        this.setupDisplayCallbacks();

        // Setup palette
        this.setupPalette();

        // Make editor available globally for callbacks
        (window as any).editor = this;

        // Add keyboard handlers
        this.setupKeyboardHandlers();
    }

    private setupDisplayCallbacks(): void {
        // Add tool button handlers first
        const pointerButton = document.getElementById('pointer-tool');
        const areaButton = document.getElementById('area-tool');
        const panButton = document.getElementById('pan-tool');
        const rotateButton = document.getElementById('rotate-tool');
        const fillButton = document.getElementById('fill-tool');
        const exportButton = document.getElementById('export-tool');
        const importButton = document.getElementById('import-tool');
        const lockButton = document.getElementById('lock-tool');
        const reloadButton = document.getElementById('reload-tool');
        
        if (pointerButton && areaButton && panButton && rotateButton) {
            pointerButton.addEventListener('click', () => {
                this.currentTool = 'pointer';
                pointerButton.classList.add('active');
                areaButton.classList.remove('active');
                panButton.classList.remove('active');
                rotateButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });
            
            areaButton.addEventListener('click', () => {
                this.currentTool = 'area';
                areaButton.classList.add('active');
                pointerButton.classList.remove('active');
                panButton.classList.remove('active');
                rotateButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            panButton.addEventListener('click', () => {
                this.currentTool = 'pan';
                panButton.classList.add('active');
                pointerButton.classList.remove('active');
                areaButton.classList.remove('active');
                rotateButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            rotateButton.addEventListener('click', () => {
                this.currentTool = 'rotate';
                rotateButton.classList.add('active');
                pointerButton.classList.remove('active');
                areaButton.classList.remove('active');
                panButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });
        }

        // Add other tool button handlers
        if (fillButton) {
            fillButton.addEventListener('click', () => this.handleFill());
        }

        if (exportButton) {
            exportButton.addEventListener('click', () => this.handleExport());
        }

        if (importButton) {
            importButton.addEventListener('click', () => this.handleImport());
        }

        if (lockButton) {
            // Set initial state
            lockButton.classList.add('active');
            
            lockButton.addEventListener('click', () => {
                this.isPaletteLocked = !this.isPaletteLocked;
                if (this.isPaletteLocked) {
                    lockButton.classList.add('active');
                    logger.info('Palette locked');
                } else {
                    lockButton.classList.remove('active');
                    logger.info('Palette unlocked');
                }
            });
        }

        if (reloadButton) {
            reloadButton.addEventListener('click', () => this.handleReload());
        }

        // Add cell click handler
        this.display.onCellClick((point: Point | null, transition: MouseTransition, event: MouseEvent) => {
            if (this.currentTool === 'pan') {
                if (transition === 'down') {
                    this.isPanning = true;
                    this.lastPanPoint = point;
                } else {
                    this.isPanning = false;
                    this.lastPanPoint = null;
                }
                return;
            }

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

        // Hover handler
        let lastClientX: number | null = null;
        let lastClientY: number | null = null;

        this.display.onCellHover((point: Point | null, event: MouseEvent) => {  // Add event parameter
            if (this.isPanning) {
                if (lastClientX !== null && lastClientY !== null) {
                    const dx = (event.clientX - lastClientX) / this.display.getCellWidth();
                    const dy = (event.clientY - lastClientY) / this.display.getCellHeight();
                    
                    const viewport = this.display.getViewport();
                    this.display.setViewport(
                        viewport.x - Math.round(dx),
                        viewport.y - Math.round(dy)
                    );
                }
                lastClientX = event.clientX;
                lastClientY = event.clientY;
                return;
            } else {
                lastClientX = null;
                lastClientY = null;
            }
            
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
            
            // Right-click drag behavior
            if (this.isRightMouseDown && point) {
                if (!this.lastDragCell || 
                    this.lastDragCell.x !== point.x || 
                    this.lastDragCell.y !== point.y) {
                    this.handleRightClick(point);
                    this.lastDragCell = point;
                }
            }
        });

        // Add right-click handler
        this.display.onCellRightClick((point: Point | null) => {
            if (!point) return;

            if (this.currentTool === 'rotate') {
                this.handleRotation(point);
                return;
            }

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
    }

    private async setupPalette(): Promise<void> {
        const PALETTE_CELL_SIZE = 32;
        const PALETTE_WIDTH = 16;
        const PALETTE_HEIGHT = 3;

        // Create palette display with explicit dimensions
        this.paletteDisplay = new Display({
            elementId: 'palette-canvas',
            cellWidth: PALETTE_CELL_SIZE,
            cellHeight: PALETTE_CELL_SIZE,
            worldWidth: PALETTE_WIDTH,
            worldHeight: PALETTE_HEIGHT,
            viewportWidth: PALETTE_WIDTH,
            viewportHeight: PALETTE_HEIGHT
        });

        // Set explicit canvas size in CSS
        const paletteCanvas = document.getElementById('palette-canvas') as HTMLCanvasElement;
        if (paletteCanvas) {
            paletteCanvas.style.width = `${PALETTE_WIDTH * PALETTE_CELL_SIZE}px`;
            paletteCanvas.style.height = `${PALETTE_HEIGHT * PALETTE_CELL_SIZE}px`;
        }

        // Create a new world for the palette
        const paletteWorld = new World(PALETTE_WIDTH, PALETTE_HEIGHT);
        
        // Setup palette renderer
        this.paletteRenderer = new EditorRenderer(paletteWorld, this.paletteDisplay);

        try {
            // Use the imported JSON directly
            const paletteData: PaletteData = basicPalette;
            logger.info('Loaded palette data:', paletteData);

            // Load entities from palette definition
            paletteData.entities.forEach((entityData, index) => {
                const x = index % PALETTE_WIDTH;
                const y = Math.floor(index / PALETTE_WIDTH);
                
                try {
                    // Create entity from template
                    const entity = Entity.deserialize({
                        ...entityData,
                        position: { x, y }
                    });
                    paletteWorld.addEntity(entity);
                } catch (e) {
                    logger.error(`Failed to create palette entity:`, entityData, e);
                }
            });

            // Handle clicks on palette
            this.paletteDisplay.onCellClick((point: Point | null, transition: MouseTransition) => {
                if (!point || transition !== 'down') return;
    
                const index = point.y * PALETTE_WIDTH + point.x;
                if (index >= 0 && index < paletteData.entities.length) {
                    const entity = Entity.deserialize({
                        ...paletteData.entities[index],
                        position: point
                    });
                    this.state.setEntityClipboard(entity);
                    logger.info('Selected entity from palette:', paletteData.entities[index].id);
                }
            });
    
            // Add hover effect
            this.paletteDisplay.onCellHover((point: Point | null) => {
                if (!point && this.paletteRenderer) {
                    this.paletteRenderer.hoverCell(null);
                    return;
                }
                
                if (point && this.paletteRenderer) {
                    const index = point.y * PALETTE_WIDTH + point.x;
                    if (index >= 0 && index < paletteData.entities.length) {
                        this.paletteRenderer.hoverCell(point);
                    }
                }
            });
    
            // Add right-click handler for the palette
            this.paletteDisplay.onCellRightClick((point: Point | null) => {
                if (!point) return;
                
                // If palette is locked, ignore right clicks
                if (this.isPaletteLocked) {
                    logger.info('Cannot modify palette while locked');
                    return;
                }
                
                const clipboard = this.state.getClipboard();
                if (clipboard.type === 'entity' && clipboard.entity) {
                    // Get the world from the palette renderer
                    const paletteWorld = this.paletteRenderer?.getWorld();
                    if (!paletteWorld) return;
    
                    // Remove any existing entities at this position
                    const existingEntities = paletteWorld.getEntitiesAt(point);
                    existingEntities.forEach(entity => {
                        paletteWorld.removeEntity(entity.getId());
                    });
    
                    // Create and place the new entity
                    const entity = clipboard.entity.clone();
                    entity.setPosition(point.x, point.y);
                    paletteWorld.addEntity(entity);
                    
                    logger.info('Pasted entity to palette at:', point);
                }
            });    

        } catch (error) {
            logger.error('Failed to load palette:', error);
            return;
        }

        // Start the render loop for the palette
        const renderPalette = (timestamp: number) => {
            if (this.paletteRenderer) {
                this.paletteRenderer.update(timestamp);
                requestAnimationFrame(renderPalette);
            }
        };
        requestAnimationFrame(renderPalette);

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
        if (!point) return;

        const clipboard = this.state.getClipboard();
        if (clipboard.type === 'entity' && clipboard.entity) {
            // Check if there's a matching entity at this position
            const entities = this.world.getEntitiesAt(point);
            const sortedEntities = this.getEntitiesSortedByZIndex(entities);
            
            if (sortedEntities.length > 0) {
                const topEntity = sortedEntities[0];
                // Add position check to ensure we're only comparing entities at the exact position
                if (this.entitiesHaveSameComponents(topEntity, clipboard.entity) && 
                    topEntity.getPosition().x === point.x && 
                    topEntity.getPosition().y === point.y) {
                    // Remove the matching entity
                    this.world.removeEntity(topEntity.getId());
                    logger.info('Removed matching entity at:', point);
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
        const components1 = Array.from(entity1.getComponents());
        const components2 = Array.from(entity2.getComponents());

        if (components1.length !== components2.length) {
            return false;
        }

        // Sort components by type to ensure consistent comparison
        components1.sort((a, b) => a.type.localeCompare(b.type));
        components2.sort((a, b) => a.type.localeCompare(b.type));

        return components1.every((comp1, index) => {
            const comp2 = components2[index];
            // Compare component types and serialized data
            return comp1.type === comp2.type && 
                   JSON.stringify(comp1.serialize()) === JSON.stringify(comp2.serialize());
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

        // Get entities at clicked position
        const entities = this.world.getEntitiesAt(point);
        if (entities.length > 0) {
            // Sort by z-index and get the topmost entity
            const sortedEntities = this.getEntitiesSortedByZIndex(entities);
            const topEntity = sortedEntities[0];
            
            // Clone the entity before putting it in clipboard
            this.state.setEntityClipboard(topEntity.clone());
            logger.info('Copied entity to clipboard from world click');
        }

        this.state.setSelectedCell(point);
        this.renderer.highlightCells(this.selectedCells);

        // Update entity panel with all selected entities
        this.updateEntityPanel(this.getEntitiesInSelectedCells());
    }

    private updateEntityPanel(entities: Entity[]): void {
        const panel = document.getElementById('entity-panel');
        if (!panel) return;

        if (entities.length === 1) {
            const entity = entities[0];
            const components = entity.getComponents();
            
            // Get all registered component types
            const registeredComponents = Array.from(ComponentRegistry.getRegisteredComponents().keys());
            
            let html = `
                <div class="entity-header">
                    <span>Entity ${entity.getId()}</span>
                    <div class="entity-controls">
                        <div class="add-component-control">
                            <select id="component-type-select">
                                <option value="">Add Component...</option>
                                ${registeredComponents.map(type => `
                                    <option value="${type}">${type}</option>
                                `).join('')}
                            </select>
                            <button class="icon-button" title="Add Component" onclick="window.editor.addComponent('${entity.getId()}', document.getElementById('component-type-select').value)">➕</button>
                        </div>
                        <button class="icon-button" title="Copy Entity" onclick="window.editor.copyEntity('${entity.getId()}')">📋</button>
                        <button class="icon-button" title="Delete Entity" onclick="window.editor.deleteEntity('${entity.getId()}')">🗑️</button>
                    </div>
                </div>
                <div class="component-grid">
                    <div class="simple-components-row">
            `;

            // Add simple components first
            components.forEach(comp => {
                const serialized = comp.serialize();
                const isSimple = Object.keys(serialized).length === 1 && 'type' in serialized;
                if (isSimple) {
                    html += `
                        <div class="simple-component-item">
                            <div class="component-header">
                                <span>${comp.type}</span>
                                <div class="component-actions">
                                    <button class="icon-button" title="Copy Component" onclick="window.editor.copyComponent('${entity.getId()}', '${comp.type}')">📋</button>
                                    <button class="icon-button" title="Delete Component" onclick="window.editor.deleteComponent('${entity.getId()}', '${comp.type}')">🗑️</button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            });

            html += '</div>';

            // Then add complex components
            components.forEach(comp => {
                const serialized = comp.serialize();
                const isSimple = Object.keys(serialized).length === 1 && 'type' in serialized;
                if (!isSimple) {
                    html += this.createComponentEditor(entity, comp);
                }
            });

            html += `
                </div>
                <div class="entity-footer">
                    <button class="icon-button" title="Paste Component" onclick="window.editor.pasteComponent('${entity.getId()}')">📋 Paste Component</button>
                </div>
            `;
            panel.innerHTML = html;
        } else {
            // Multi-select view
            let html = '<div class="entity-list">';
            
            // Add delete button for multi-select
            html += `
                <div class="multi-select-header">
                    <span>${entities.length} entities in ${this.selectedCells.length} cells</span>
                    <button class="icon-button" title="Delete All Selected" onclick="window.editor.deleteSelectedEntities()">🗑️</button>
                </div>
            `;
            
            entities.forEach(entity => {
                const components = entity.getComponents();
                html += `
                    <div class="entity-item">
                        <div class="entity-header">
                            <span>Entity ${entity.getId()}</span>
                            <button class="icon-button" title="Edit Entity" onclick="window.editor.selectSingleEntity('${entity.getId()}')">✏️</button>
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
    }

    private createComponentEditor(entity: Entity, component: Component): string {
        const componentData = JSON.stringify(component.serialize(), null, 2);
        const data = JSON.parse(componentData);
        
        // Helper to detect if a value looks like a hex color
        const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
        
        // Find all color fields in the component data
        const colorFields = Object.entries(data)
            .filter(([key, value]) => typeof value === 'string' && isHexColor(value))
            .map(([key, value]) => ({ key, value }));

        // Debug log to verify color fields are being detected
        logger.info('Color fields found:', colorFields);

        return `
            <div class="component-item">
                <div class="component-header">
                    <span>${component.type}</span>
                    <div class="component-controls">
                        <button onclick="editor.resetComponent(this)">Reset</button>
                        <button onclick="editor.saveComponent('${entity.getId()}', '${component.type}', this)">Save</button>
                    </div>
                </div>
                <div class="component-editor-container">
                    <div class="color-pickers">
                        ${colorFields.map((field, index) => `
                            <div class="color-field">
                                <span class="color-label">${field.key}:</span>
                                <div class="color-preview" style="background-color: ${field.value}" data-field="${field.key}"></div>
                                <input type="color" 
                                    class="color-picker" 
                                    value="${field.value}"
                                    data-field="${field.key}"
                                    onchange="editor.updateColorPreview(this)"
                                />
                            </div>
                        `).join('')}
                    </div>
                    <textarea
                        class="component-data"
                        data-edited="false"
                        oninput="editor.handleComponentEdit(this)"
                    >${componentData}</textarea>
                </div>
            </div>
        `;
    }

    public copyEntity(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (entity) {
            this.state.setEntityClipboard(entity.clone());
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

        // Create and place the new entity
        const newEntity = clipboard.entity.clone();
        newEntity.setPosition(point.x, point.y);
        this.world.addEntity(newEntity);
        
        logger.info('Placed entity at:', point);
    }

    public update(timestamp: number): void {
        this.renderer.update(timestamp);
        // Update palette renderer if it exists
        if (this.paletteRenderer) {
            this.paletteRenderer.update(timestamp);
        }
    }

    public getWorld(): World {
        return this.world;
    }

    public getDisplay(): Display {
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
            // Clone component before storing in clipboard
            this.state.setComponentClipboard([component.clone()]);
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
            // Don't handle delete/backspace if we're in a text area or input
            if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
                return;
            }

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

    private serializeWorld() {
        // Track any entities/components that fail to serialize
        const failedEntities: string[] = [];
        const failedComponents: {entityId: string, componentType: string}[] = [];

        logger.info(`World state pre-export: ${this.world.getEntities().length} entities, ${this.world.getWorldWidth()}x${this.world.getWorldHeight()}`);

        // get counts of all components
        const componentCounts = this.world.getEntities().reduce((acc, entity) => {
            entity.getComponents().forEach(component => {
                acc[component.type] = (acc[component.type] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        logger.info(`Component counts: ${JSON.stringify(componentCounts)}`);

        const exportData = {
            version: '1.0',
            width: this.world.getWorldWidth(),
            height: this.world.getWorldHeight(),
            entities: this.world.getEntities().map(entity => {
                try {
                    const components = Array.from(entity.getComponents()).map(component => {
                        try {
                            return component.serialize();
                        } catch (e) {
                            failedComponents.push({
                                entityId: entity.getId(),
                                componentType: component.type
                            });
                            logger.error(`Failed to serialize component ${component.type} for entity ${entity.getId()}:`, e);
                            return null;
                        }
                    }).filter(comp => comp !== null); // Remove failed components

                    return {
                        id: entity.getId(),
                        position: entity.getPosition(),
                        components
                    };
                } catch (e) {
                    failedEntities.push(entity.getId());
                    logger.error(`Failed to serialize entity ${entity.getId()}:`, e);
                    return null;
                }
            }).filter(entity => entity !== null) // Remove failed entities
        };

        logger.info(`Export metadata: ${exportData.entities.length} entities, ${exportData.width}x${exportData.height}`);
        
        // Cross-check component counts in export data
        const exportComponentCounts = exportData.entities.reduce((acc, entity) => {
            entity.components.forEach(component => {
                acc[component.type] = (acc[component.type] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        logger.info(`Export component counts: ${JSON.stringify(exportComponentCounts)}`);

        return {
            exportData,
            failedEntities,
            failedComponents
        };
    }

    private handleReload(): void {
        try {
            const { exportData, failedEntities, failedComponents } = this.serializeWorld();

            logger.info(`failed entities: ${failedEntities.length}`);
            logger.info(`failed components: ${failedComponents.length}`);

            // Create new generator with the exported data
            const generator = new JsonWorldGenerator(exportData);
            
            // Generate new world
            const newWorld = generator.generate();
            
            // Store the new world
            this.world = newWorld;

            // Recreate display with new world dimensions
            this.display = new Display({
                elementId: CANVAS_ID,
                cellWidth: 20,
                cellHeight: 20,
                worldWidth: newWorld.getWorldWidth(),
                worldHeight: newWorld.getWorldHeight(),
                viewportWidth: newWorld.getWorldWidth(),
                viewportHeight: newWorld.getWorldHeight()
            });

            // Create new renderer with new world and display
            this.renderer = new EditorRenderer(this.world, this.display);

            // Clear any existing selections
            this.selectedCells = [];
            
            logger.info('Successfully reloaded world:', {
                width: newWorld.getWorldWidth(),
                height: newWorld.getWorldHeight(),
                entities: newWorld.getEntities().length
            });
        } catch (error) {
            logger.error('Failed to reload world:', error);
        }
    }

    private async handleExport(): Promise<void> {
        try {
            const { exportData, failedEntities, failedComponents } = this.serializeWorld();

            if (failedEntities.length > 0 || failedComponents.length > 0) {
                const proceed = confirm(
                    `Warning: Some entities or components failed to export.\n` +
                    `Failed entities: ${failedEntities.length}\n` +
                    `Failed components: ${failedComponents.length}\n` +
                    `Check console for details.\n\n` +
                    `Do you want to proceed with the export?`
                );
                if (!proceed) return;
            }

            const jsonString = JSON.stringify(exportData, null, 2);

            // Check if the API is available
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: 'level.json',
                        types: [{
                            description: 'JSON Files',
                            accept: {
                                'application/json': ['.json'],
                            },
                        }],
                    });

                    const writable = await handle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();

                    logger.info('Export complete:', {
                        entities: exportData.entities.length,
                        dimensions: `${this.world.getWorldWidth()}x${this.world.getWorldHeight()}`,
                        fileSize: `${(jsonString.length / 1024).toFixed(2)}KB`
                    });
                } catch (err) {
                    if (!(err instanceof DOMException && err.name === 'AbortError')) {
                        logger.error('Failed to save export file:', err);
                        alert('Failed to save file. Check console for details.');
                    }
                }
            } else {
                // Fallback to download method
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'level.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                logger.info('Exported level data. entities: ${this.world.getEntities().length}, dimensions: ${this.world.getWorldWidth()}x${this.world.getWorldHeight()}');
            }
        } catch (e) {
            logger.error('Critical export error:', e);
            alert('Export failed. Check console for details.');
        }
    }

    private cleanupDisplay(): void {
        if (this.display) {
            this.display.removeAllEventListeners();
        }
    }

    private handleImport(): void {
        // Create a hidden file input
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        
        fileInput.addEventListener('change', async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            try {
                const jsonContent = await file.text();
                const jsonData = JSON.parse(jsonContent);
                
                // Create new generator with the loaded data
                const generator = new JsonWorldGenerator(jsonData);
                
                // Generate new world
                const newWorld = generator.generate();
                
                // Store the new world
                this.world = newWorld;

                const currentViewport = this.display.getViewport();
                
                // Clean up old display
                this.cleanupDisplay();
                
                // Recreate display with new world dimensions
                this.display = new Display({
                    elementId: CANVAS_ID,
                    cellWidth: 20,
                    cellHeight: 20,
                    worldWidth: newWorld.getWorldWidth(),
                    worldHeight: newWorld.getWorldHeight(),
                    viewportWidth: currentViewport.width,
                    viewportHeight: currentViewport.height
                });

                // Create new renderer with new world and display
                this.renderer = new EditorRenderer(this.world, this.display);

                // Clear any existing selections
                this.selectedCells = [];

                // Re-setup display callbacks
                this.setupDisplayCallbacks();
                
                logger.info('Successfully imported world:', {
                    width: newWorld.getWorldWidth(),
                    height: newWorld.getWorldHeight(),
                    entities: newWorld.getEntities().length
                });
            } catch (error) {
                logger.error('Failed to import world:', error);
            }
        });

        // Trigger file dialog
        fileInput.click();
    }

    // Add new method to handle single entity selection
    public selectSingleEntity(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        // Update the panel to show just this entity
        this.updateEntityPanel([entity]);
    }

    private handleRotation(point: Point): void {
        const entities = this.world.getEntitiesAt(point);
        const sortedEntities = this.getEntitiesSortedByZIndex(entities);
        
        for (const entity of sortedEntities) {
            const facingComponent = entity.getComponent('facing') as FacingComponent;
            if (facingComponent) {
                // Get current facing direction
                const currentFacing = facingComponent.direction;
                
                // Calculate new facing direction (90 degrees clockwise)
                const directions: Direction[] = [
                    Direction.North,
                    Direction.East,
                    Direction.South,
                    Direction.West
                ];
                const currentIndex = directions.indexOf(currentFacing);
                const newIndex = (currentIndex + 1) % 4;
                const newFacing = directions[newIndex];
                
                // Update facing direction
                facingComponent.direction = newFacing;
                logger.info(`Rotated entity ${entity.getId()} from ${currentFacing} to ${newFacing}`);
                
                // Update the entity panel to show the new rotation
                this.updateEntityPanel([entity]);
                
                // Only rotate the first entity with a facing component
                break;
            }
        }
    }

    // Update the color preview handler to handle multiple color fields
    public updateColorPreview(input: HTMLInputElement): void {
        const textarea = input.closest('.component-editor-container')?.querySelector('textarea');
        if (!textarea) return;

        try {
            const data = JSON.parse(textarea.value);
            const field = input.dataset.field;
            if (field) {
                data[field] = input.value;
                textarea.value = JSON.stringify(data, null, 2);
                textarea.dataset.edited = 'true';
                
                // Update the preview div
                const preview = input.closest('.component-editor-container')
                    ?.querySelector(`.color-preview[data-field="${field}"]`) as HTMLElement;
                if (preview) {
                    preview.style.backgroundColor = input.value;
                }
                
                // Show the save/reset controls
                const controls = input.closest('.component-item')?.querySelector('.component-controls');
                if (controls && controls instanceof HTMLElement) {
                    controls.style.display = 'flex';
                }

                // Auto-save the component
                const componentItem = input.closest('.component-item');
                if (componentItem) {
                    const saveButton = componentItem.querySelector('.component-controls button:last-child') as HTMLButtonElement;
                    if (saveButton) {
                        // Extract entity ID and component type from the save button's onclick handler
                        const onclickAttr = saveButton.getAttribute('onclick') || '';
                        const match = onclickAttr.match(/editor\.saveComponent\('([^']+)',\s*'([^']+)'/);
                        if (match) {
                            const [_, entityId, componentType] = match;
                            this.saveComponent(entityId, componentType, saveButton);
                        }
                    }
                }
            }
        } catch (e) {
            logger.error('Failed to update color preview:', e);
        }
    }
}

// Make editor available to window for button callbacks
declare global {
    interface Window {
        editor: Editor;
        showSaveFilePicker?: (options?: {
            suggestedName?: string;
            types?: Array<{
                description: string;
                accept: Record<string, string[]>;
            }>;
        }) => Promise<FileSystemFileHandle>;
    }
} 