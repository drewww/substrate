import { World } from '../world/world';
import { EditorDisplay } from './editor-display';
import { EditorStateManager } from './editor-state';
import { Point } from '../types';
import { EditorRenderer } from './editor-renderer';
import { createWallEntity } from './templates/wall';
import { logger } from '../util/logger';


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
        const wallButton = document.createElement('button');
        wallButton.textContent = 'Wall';
        wallButton.addEventListener('click', () => {
            this.state.setClipboard(createWallEntity);
        });
        entityPalette.appendChild(wallButton);
    }

    // private handleClick(e: MouseEvent): void {
    //     e.preventDefault();

    //     logger.info('Click');

    //     const rect = (e.target as HTMLElement).getBoundingClientRect();
    //     const x = e.clientX - rect.left;
    //     const y = e.clientY - rect.top;
        
    //     const cell = this.display.getCellAtPixel(x, y);
    //     if (cell) {
    //         this.handleCellClick(cell);
    //     }
    // }

    private handleRightClick(point: Point | null): void {
        if(!point) return;
        
        logger.info('Right click', point);

        if (this.state.getClipboard()) {
            this.placeEntity(point);
        }
    }

    private handleCellClick(point: Point | null): void {
        if(!point) return;

        logger.info('Cell clicked', point);
       
        this.state.setSelectedCell(point);
        this.renderer.highlightCell(point);
        // TODO: Update entity panel

        this.placeEntity(point);
    }

    private placeEntity(point: Point): void {
        const clipboard = this.state.getClipboard();
        if (!clipboard) return;

        // Create a new entity from the clipboard
        // const entity = new Entity();
        // clipboard.getComponents().forEach(component => {
        //     entity.setComponent(component);
        // });

        const entity = clipboard(point);

        // Set position
        // entity.setPosition(point);

        // Add to world
        if(entity) {
            this.world.addEntity(entity);
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
} 