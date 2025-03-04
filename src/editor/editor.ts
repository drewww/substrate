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
import { WallDirection } from '../entity/components/wall-component';

import '../entity/components/index.ts';
import '../game/components/index.ts';
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
    private currentTool: 'pointer' | 'area' | 'pan' | 'rotate' | 'wall' = 'pointer';
    private areaStartCell: Point | null = null;
    private paletteDisplay!: Display;
    private paletteRenderer!: EditorRenderer;
    private isPaletteLocked: boolean = true;
    private isPanning: boolean = false;
    private lastPanPoint: Point | null = null;
    private keyStates: Set<string> = new Set();
    private wallColor: string = '#888888';  // Default wall color
    private wallParams = {
        render: true,
        impassable: true,
        opaque: false
    };
    private isExporting = false;
    private isImporting = false;

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

        // Add this line to set the background color
        const canvas = document.getElementById(CANVAS_ID) as HTMLCanvasElement;
        if (canvas) {
            canvas.style.backgroundColor = '#ffffff';
        }

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

        // Add keyboard state tracking for wall tool
        window.addEventListener('keydown', (e) => {
            if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
                e.preventDefault();
                this.keyStates.add(e.code);
                if (this.currentTool === 'wall' && this.isRightMouseDown) {
                    this.handleWallPlacement();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keyStates.delete(e.code);
        });

        // Set up entity panel event delegation
        const panel = document.getElementById('entity-panel');
        logger.info('Setting up entity panel event delegation');
        if (panel) {
            panel.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                logger.info('Panel clicked:', target);
                if (!target.classList.contains('icon-button')) {
                    logger.info('Not an icon button');
                    return;
                }
                
                const entityItem = target.closest('.entity-item');
                logger.info('Found entity item:', entityItem);
                if (!entityItem) return;
                
                const entityId = entityItem.getAttribute('data-entity-id');
                logger.info('Found entity ID:', entityId);
                if (!entityId) return;

                if (target.classList.contains('edit')) {
                    logger.info('Edit button clicked for entity:', entityId);
                    this.selectSingleEntity(entityId);
                } else if (target.classList.contains('move-up')) {
                    this.moveEntityUp(entityId);
                } else if (target.classList.contains('move-down')) {
                    this.moveEntityDown(entityId);
                } else if (target.classList.contains('delete')) {
                    this.deleteEntity(entityId);
                }
            });
        } else {
            logger.error('Could not find entity panel element');
        }

        // Add resize handler
        document.getElementById('resize-tool')?.addEventListener('click', () => {
            this.handleResize();
        });
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
        const wallButton = document.getElementById('wall-tool');
        const wallColorPicker = document.getElementById('wall-color') as HTMLInputElement;
        const wallParamsDiv = document.getElementById('wall-params');
        const wallRender = document.getElementById('wall-render') as HTMLInputElement;
        const wallImpassable = document.getElementById('wall-impassable') as HTMLInputElement;
        const wallOpaque = document.getElementById('wall-opaque') as HTMLInputElement;
        
        if (pointerButton && areaButton && panButton && rotateButton && wallButton) {
            pointerButton.addEventListener('click', () => {
                this.currentTool = 'pointer';
                pointerButton.classList.add('active');
                areaButton.classList.remove('active');
                panButton.classList.remove('active');
                rotateButton.classList.remove('active');
                wallButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });
            
            areaButton.addEventListener('click', () => {
                this.currentTool = 'area';
                areaButton.classList.add('active');
                pointerButton.classList.remove('active');
                panButton.classList.remove('active');
                rotateButton.classList.remove('active');
                wallButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            panButton.addEventListener('click', () => {
                this.currentTool = 'pan';
                panButton.classList.add('active');
                pointerButton.classList.remove('active');
                areaButton.classList.remove('active');
                rotateButton.classList.remove('active');
                wallButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            rotateButton.addEventListener('click', () => {
                this.currentTool = 'rotate';
                rotateButton.classList.add('active');
                pointerButton.classList.remove('active');
                areaButton.classList.remove('active');
                panButton.classList.remove('active');
                wallButton.classList.remove('active');
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            wallButton.addEventListener('click', () => {
                this.currentTool = 'wall';
                wallButton.classList.add('active');
                pointerButton.classList.remove('active');
                areaButton.classList.remove('active');
                panButton.classList.remove('active');
                rotateButton.classList.remove('active');
                wallColorPicker.style.display = 'inline-block';  // Show color picker
                wallParamsDiv!.style.display = 'inline-flex';  // Show parameters
                this.renderer.clearHighlights();
                this.selectedCells = [];
            });

            // Hide color picker and parameters when other tools are selected
            [pointerButton, areaButton, panButton, rotateButton].forEach(button => {
                button?.addEventListener('click', () => {
                    wallColorPicker.style.display = 'none';
                    wallParamsDiv!.style.display = 'none';
                });
            });

            // Update wall color and parameters when picker changes
            wallColorPicker.addEventListener('input', (e) => {
                this.wallColor = (e.target as HTMLInputElement).value;
            });

            // Update wall parameters when checkboxes change
            wallRender.addEventListener('change', () => {
                this.wallParams.render = wallRender.checked;
            });
            
            wallImpassable.addEventListener('change', () => {
                this.wallParams.impassable = wallImpassable.checked;
            });
            
            wallOpaque.addEventListener('change', () => {
                this.wallParams.opaque = wallOpaque.checked;
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

        // Add hover handler
        this.display.onCellHover((point: Point | null, event: MouseEvent) => {
            if (this.isPanning && this.lastPanPoint && point) {
                const viewport = this.display.getViewport();
                const dx = point.x - this.lastPanPoint.x;
                const dy = point.y - this.lastPanPoint.y;
                
                // Update viewport position relative to initial pan point
                this.display.setViewport(
                    viewport.x - dx,
                    viewport.y - dy
                );
                
                // Don't update lastPanPoint - keep initial point for reference
                return;
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

            this.isRightMouseDown = true;
            this.lastDragCell = point;

            if (this.currentTool === 'rotate') {
                this.handleRotation(point);
                return;
            }

            if (this.currentTool === 'wall') {
                this.handleWallPlacement();
                return;
            }

            this.handleRightClick(point);
        });

        // Add mouse up handler to window to catch releases outside the canvas
        window.addEventListener('mouseup', (e: MouseEvent) => {
            if (e.button === 2) { // Right mouse button
                this.isRightMouseDown = false;
                this.lastDragCell = null;
                // Clear any ongoing actions
                if (this.currentTool === 'wall') {
                    this.keyStates.clear();
                }
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
        this.paletteRenderer.setLightsEnabled(false);  // Disable lights for palette

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
                    const canvas = document.getElementById('palette-canvas') as HTMLCanvasElement;
                    if (canvas) canvas.title = '';
                    return;
                }
                
                if (point && this.paletteRenderer) {
                    const index = point.y * PALETTE_WIDTH + point.x;
                    if (index >= 0 && index < paletteData.entities.length) {
                        this.paletteRenderer.hoverCell(point);
                        const canvas = document.getElementById('palette-canvas') as HTMLCanvasElement;
                        if (canvas) canvas.title = `${paletteData.entities[index].id}`;
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

        // If we're in single-entity view, clear it first
        if (this.state.getState().selectedEntityId) {
            this.clearSelectedEntity();
        }

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

        // If we're in single-entity view, clear it first
        if (this.state.getState().selectedEntityId) {
            this.clearSelectedEntity();
        }

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

        // If there's exactly one entity, switch to entity detail mode
        if (entities.length === 1) {
            const entity = entities[0];
            this.state.setSelectedEntity(entity.getId());
        }

        // Get the currently selected entity ID from state
        const selectedEntityId = this.state.getState().selectedEntityId;
        
        if (this.selectedCells.length === 1 && selectedEntityId) {  // Single cell AND entity selected
            const selectedEntity = this.world.getEntity(selectedEntityId);
            if (!selectedEntity) return;

            // Show full component editor for selected entity
            let html = '<div class="entity-list">';
            html += `
                <div class="entity-item" data-entity-id="${selectedEntity.getId()}">
                    <div class="entity-header">
                        <span>Entity ${selectedEntity.getId()}</span>
                        <div class="entity-controls">
                            <button class="icon-button" title="Back to Cell View" onclick="window.editor.clearSelectedEntity()">⬅️</button>
                        </div>
                    </div>
                </div>
            `;
            selectedEntity.getComponents().forEach(component => {
                html += this.createComponentEditor(selectedEntity, component);
            });
            html += '</div>';
            panel.innerHTML = html;
        } else if (this.selectedCells.length === 1) {  // Single cell, no entity selected
            // Sort entities by z-index
            const sortedEntities = this.getEntitiesSortedByZIndex(entities);
            
            let html = '<div class="entity-list">';
            sortedEntities.forEach((entity, index) => {
                const symbolComp = entity.getComponent('symbol') as SymbolComponent;
                const zIndex = symbolComp?.zIndex ?? 0;
                
                html += `
                    <div class="entity-item" data-entity-id="${entity.getId()}">
                        <div class="entity-header">
                            <span>Entity ${entity.getId()} (z: ${zIndex})</span>
                            <div class="entity-controls">
                                ${index > 0 ? 
                                    `<button class="icon-button move-up" title="Move Up">⬆️</button>` 
                                    : ''
                                }
                                ${index < sortedEntities.length - 1 ? 
                                    `<button class="icon-button move-down" title="Move Down">⬇️</button>`
                                    : ''
                                }
                                <button class="icon-button edit" title="Edit Entity">✏️</button>
                                <button class="icon-button delete" title="Delete Entity">🗑️</button>
                            </div>
                        </div>
                        <div class="component-list">
                            ${entity.getComponents().map(comp => `<div class="simple-component">${comp.type}</div>`).join('')}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
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
            
            // Sort entities by z-index within each cell
            const sortedEntities = this.getEntitiesSortedByZIndex(entities);
            
            sortedEntities.forEach(entity => {
                const symbolComp = entity.getComponent('symbol') as SymbolComponent;
                const zIndex = symbolComp?.zIndex ?? 0;
                
                html += `
                    <div class="entity-item" data-entity-id="${entity.getId()}">
                        <div class="entity-header">
                            <span>Entity ${entity.getId()} (z: ${zIndex})</span>
                            <div class="entity-controls">
                                <button class="icon-button edit" title="Edit Entity">✏️</button>
                                <button class="icon-button delete" title="Delete Entity">🗑️</button>
                            </div>
                        </div>
                        <div class="component-list">
                            ${entity.getComponents().map(comp => `<div class="simple-component">${comp.type}</div>`).join('')}
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
        
        // Check if this is a "simple" component (only has type property)
        const properties = Object.keys(data);
        if (properties.length === 1 && properties[0] === 'type') {
            return `
                <div class="simple-component-item">
                    <div class="component-header">
                        <span>${component.type}</span>
                    </div>
                </div>
            `;
        }
        
        // Calculate lines in JSON for textarea height (add a bit of padding)
        const lineCount = componentData.split('\n').length;
        const lineHeight = 16; // reduced from 20px to 16px per line
        const height = (lineCount) * lineHeight; // +1 for some padding
        
        // Helper to detect if a value looks like a hex color
        const isHexColor = (value: string) => /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value);
        
        // Convert 8-digit hex to 6-digit hex for the color input
        const convertToHex6 = (hex8: string) => hex8.length === 9 ? hex8.substring(0, 7) : hex8;
        
        // Find all color fields in the component data
        const colorFields = Object.entries(data)
            .filter((entry): entry is [string, string] => {
                const [_, value] = entry;
                return typeof value === 'string' && isHexColor(value);
            })
            .map(([key, value]) => ({ 
                key, 
                value,
                hex6: convertToHex6(value)
            }));

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
                                    value="${field.hex6}"
                                    data-field="${field.key}"
                                    data-original="${field.value}"
                                    onchange="editor.updateColorPreview(this)"
                                />
                            </div>
                        `).join('')}
                    </div>
                    <textarea
                        class="component-data"
                        data-edited="false"
                        oninput="editor.handleComponentEdit(this)"
                        onblur="editor.saveComponent('${entity.getId()}', '${component.type}', this)"
                        style="height: ${height}px; min-height: ${height}px;"
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
        // Prevent double execution
        if (this.isExporting) return;
        this.isExporting = true;

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
        } finally {
            // Reset flag after export completes or fails
            this.isExporting = false;
        }
    }

    private cleanupDisplay(): void {
        if (this.display) {
            this.display.removeAllEventListeners();
            // Reset all mouse states
            this.isRightMouseDown = false;
            this.isLeftMouseDown = false;
            this.lastDragCell = null;
            this.isPanning = false;
            this.lastPanPoint = null;
            // Clear selections
            this.selectedCells = [];
            this.renderer.clearHighlights();
        }
    }

    private handleImport(): void {
        // Prevent double execution
        if (this.isImporting) return;
        this.isImporting = true;

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
                
                // Check for width and height in the JSON
                if (typeof jsonData.width !== 'number' || typeof jsonData.height !== 'number') {
                    throw new Error('Invalid world data: missing width or height');
                }

                // Create new generator with the loaded data
                const generator = new JsonWorldGenerator(jsonData);
                
                // Generate new world
                this.world = generator.generate();

                // Calculate viewport size to match world size
                const viewportWidth = Math.floor(jsonData.width);
                const viewportHeight = Math.floor(jsonData.height);
                
                // Clean up old display
                this.cleanupDisplay();
                
                // Reset all mouse states
                this.isRightMouseDown = false;
                this.isLeftMouseDown = false;
                this.lastDragCell = null;
                this.isPanning = false;
                this.lastPanPoint = null;
                
                // Recreate display with dimensions from JSON
                this.display = new Display({
                    elementId: CANVAS_ID,
                    cellWidth: 20,
                    cellHeight: 20,
                    worldWidth: jsonData.width,
                    worldHeight: jsonData.height,
                    viewportWidth: viewportWidth,
                    viewportHeight: viewportHeight
                });

                // Create new renderer with new world and display
                this.renderer = new EditorRenderer(this.world, this.display);
                
                // Clear selections
                this.selectedCells = [];
                
                // Re-setup display callbacks
                this.setupDisplayCallbacks();
                
                logger.info('Successfully imported world:', {
                    width: jsonData.width,
                    height: jsonData.height,
                    entities: jsonData.entities.length
                });
            } catch (error) {
                logger.error('Failed to import world:', error);
                alert('Failed to import world: ' + (error as Error).message);
            } finally {
                // Reset flag after import completes or fails
                this.isImporting = false;
            }
        });

        // Trigger file dialog
        fileInput.click();
    }

    // Add new method to handle single entity selection
    public selectSingleEntity(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        // Clear current selection
        this.selectedCells = [];
        this.renderer.clearHighlights();

        // Select only the cell containing this entity
        const pos = entity.getPosition();
        this.selectedCells = [pos];
        this.renderer.highlightCells(this.selectedCells);

        // Update state and panel
        this.state.setSelectedCell(pos);
        this.state.setSelectedEntity(entity.getId());
        
        const entities = this.world.getEntitiesAt(pos);
        this.updateEntityPanel(entities);
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
                entity.setComponent(facingComponent);
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
                // Preserve alpha channel if it existed in original color
                const originalColor = input.dataset.original || '';
                const newColor = input.value + (originalColor.length === 9 ? originalColor.slice(-2) : '');
                
                data[field] = newColor;
                textarea.value = JSON.stringify(data, null, 2);
                textarea.dataset.edited = 'true';
                
                // Update the preview div
                const preview = input.closest('.component-editor-container')
                    ?.querySelector(`.color-preview[data-field="${field}"]`) as HTMLElement;
                if (preview) {
                    preview.style.backgroundColor = newColor;
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

    private handleWallPlacement(): void {
        if (!this.lastDragCell) return;

        const keyToDirection = {
            'KeyW': WallDirection.NORTH,
            'KeyS': WallDirection.SOUTH,
            'KeyA': WallDirection.WEST,
            'KeyD': WallDirection.EAST
        } as const;

        // Check which WASD keys are pressed
        for (const [key, direction] of Object.entries(keyToDirection)) {
            if (this.keyStates.has(key)) {
                const currentProperties = this.world.hasWall(this.lastDragCell, direction);
                
                // If wall exists (first property is true), remove it
                if (currentProperties[0]) {
                    this.world.removeWall(this.lastDragCell, direction);
                } else {
                    // If no wall exists, add one with current parameters
                    this.world.setWall(this.lastDragCell, direction, {
                        properties: [
                            this.wallParams.render,    // RENDER = 0
                            this.wallParams.opaque,    // OPAQUE = 1
                            this.wallParams.impassable // IMPASSABLE = 2
                        ],
                        color: this.wallColor
                    });
                }
            }
        }
    }

    public moveEntityUp(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        const pos = entity.getPosition();
        const entitiesAtPos = this.world.getEntitiesAt(pos);
        const sortedEntities = this.getEntitiesSortedByZIndex(entitiesAtPos);
        
        // Find current entity's index
        const currentIndex = sortedEntities.findIndex(e => e.getId() === entityId);
        if (currentIndex <= 0) return; // Already at top
        
        // Get the entity above this one
        const entityAbove = sortedEntities[currentIndex - 1];
        const currentSymbol = entity.getComponent('symbol') as SymbolComponent;
        const aboveSymbol = entityAbove.getComponent('symbol') as SymbolComponent;
        
        if (currentSymbol && aboveSymbol) {
            // Set z-index to one more than the entity above
            currentSymbol.zIndex = aboveSymbol.zIndex + 1;
            entity.markComponentModified('symbol');
            
            // Update the panel
            this.updateEntityPanel(sortedEntities);
        }
    }

    public moveEntityDown(entityId: string): void {
        const entity = this.world.getEntity(entityId);
        if (!entity) return;

        const pos = entity.getPosition();
        const entitiesAtPos = this.world.getEntitiesAt(pos);
        const sortedEntities = this.getEntitiesSortedByZIndex(entitiesAtPos);
        
        // Find current entity's index
        const currentIndex = sortedEntities.findIndex(e => e.getId() === entityId);
        if (currentIndex === -1 || currentIndex === sortedEntities.length - 1) return; // Already at bottom
        
        // Get the entity below this one
        const entityBelow = sortedEntities[currentIndex + 1];
        const currentSymbol = entity.getComponent('symbol') as SymbolComponent;
        const belowSymbol = entityBelow.getComponent('symbol') as SymbolComponent;
        
        if (currentSymbol && belowSymbol) {
            // Set z-index to one less than the entity below
            currentSymbol.zIndex = belowSymbol.zIndex - 1;
            entity.markComponentModified('symbol');
            
            // Update the panel
            this.updateEntityPanel(sortedEntities);
        }
    }

    // Add this method to clear entity selection
    public clearSelectedEntity(): void {
        this.state.setSelectedEntity(null);
        if (this.selectedCells.length === 1) {
            const pos = this.selectedCells[0];
            const entities = this.world.getEntitiesAt(pos);
            this.updateEntityPanel(entities);
        }
    }

    private handleResize(): void {
        const width = prompt('Enter new width (in cells):', this.world.getWorldWidth().toString());
        const height = prompt('Enter new height (in cells):', this.world.getWorldHeight().toString());
        
        if (!width || !height) return;
        
        const newWidth = parseInt(width);
        const newHeight = parseInt(height);
        
        if (isNaN(newWidth) || isNaN(newHeight) || newWidth < 1 || newHeight < 1) {
            alert('Please enter valid positive numbers for width and height');
            return;
        }
        
        // Clean up old display
        this.cleanupDisplay();
        
        // Reset all mouse states
        this.isRightMouseDown = false;
        this.isLeftMouseDown = false;
        this.lastDragCell = null;
        this.isPanning = false;
        this.lastPanPoint = null;
        
        // Create new world with new dimensions
        this.world = new World(newWidth, newHeight);
        
        // Recreate display with new dimensions
        this.display = new Display({
            elementId: CANVAS_ID,
            cellWidth: 20,
            cellHeight: 20,
            worldWidth: newWidth,
            worldHeight: newHeight,
            viewportWidth: newWidth,
            viewportHeight: newHeight
        });
        
        // Create new renderer
        this.renderer = new EditorRenderer(this.world, this.display);
        
        // Clear selections
        this.selectedCells = [];
        
        // Re-setup display callbacks
        this.setupDisplayCallbacks();
        
        logger.info('Resized world to:', { width: newWidth, height: newHeight });
    }

    public handleComponentEdit(textarea: HTMLTextAreaElement): void {
        // Mark the textarea as edited
        textarea.dataset.edited = 'true';
        
        // Show the save/reset controls
        const controls = textarea.closest('.component-item')?.querySelector('.component-controls');
        if (controls && controls instanceof HTMLElement) {
            controls.style.display = 'flex';
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