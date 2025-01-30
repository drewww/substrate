import { World } from '../world/world';
import { EditorDisplay } from './editor-display';
import { EditorStateManager } from './editor-state';
import { Point } from '../types';
import { EditorRenderer } from './editor-renderer';

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
            elementId: 'editor-canvas',
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
    }

    private setupEventHandlers(): void {
        const displayElement = this.display.getDisplay().getRenderCanvas();
        
        displayElement.addEventListener('click', (e: MouseEvent) => this.handleClick(e));
        displayElement.addEventListener('contextmenu', (e: MouseEvent) => this.handleRightClick(e));
    }

    private handleClick(e: MouseEvent): void {
        e.preventDefault();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const cell = this.display.getCellAtPixel(x, y);
        if (cell) {
            this.handleCellClick(cell);
        }
    }

    private handleRightClick(e: MouseEvent): void {
        e.preventDefault();
        // TODO: Implement placing entities/components
    }

    private handleCellClick(point: Point): void {
        this.state.setSelectedCell(point);
        this.renderer.highlightCell(point);
        // TODO: Update entity panel
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