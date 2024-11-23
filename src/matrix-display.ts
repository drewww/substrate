import { Cell, Color, DisplayOptions, Tile, Viewport } from './types';

interface PerformanceMetrics {
    lastRenderTime: number;
    averageRenderTime: number;
    dirtyRectCount: number;
    dirtyRectPixels: number;
    totalRenderCalls: number;
    fps: number;
    lastFpsUpdate: number;
    frameCount: number;
}

export class MatrixDisplay {
    private displayCanvas: HTMLCanvasElement;    // The canvas shown to the user
    private displayCtx: CanvasRenderingContext2D;
    private worldCanvas: HTMLCanvasElement;      // Full world buffer
    private worldCtx: CanvasRenderingContext2D;
    private renderCanvas: HTMLCanvasElement;     // Intermediate render buffer
    private renderCtx: CanvasRenderingContext2D;
    private cells: Cell[][];
    private viewport: Viewport;
    private cellSize: number;
    private dirtyRects: Set<string>; // Store "x,y" strings for dirty cells
    private metrics: PerformanceMetrics;

    constructor(options: DisplayOptions) {
        console.log('Initializing MatrixDisplay with options:', options);
        
        // Main display canvas
        this.displayCanvas = document.getElementById(options.elementId) as HTMLCanvasElement;
        this.displayCtx = this.displayCanvas.getContext('2d')!;

        if (!this.displayCanvas) {
            console.error('Failed to find canvas element with id:', options.elementId);
            throw new Error('Canvas element not found');
        }
        
        console.log('Found canvas element:', this.displayCanvas);
        
        // World buffer (stores the entire world state)
        this.worldCanvas = document.createElement('canvas');
        this.worldCtx = this.worldCanvas.getContext('2d')!;
        
        // Render buffer (for compositing updates before display)
        this.renderCanvas = document.createElement('canvas');
        this.renderCtx = this.renderCanvas.getContext('2d')!;
        
        // Set dimensions
        this.cellSize = options.cellSize;
        
        // Display canvas is viewport size
        this.displayCanvas.width = options.viewportWidth * options.cellSize;
        this.displayCanvas.height = options.viewportHeight * options.cellSize;
        
        // World buffer is full world size
        this.worldCanvas.width = options.worldWidth * options.cellSize;
        this.worldCanvas.height = options.worldHeight * options.cellSize;
        
        // Render buffer matches display size
        this.renderCanvas.width = this.displayCanvas.width;
        this.renderCanvas.height = this.displayCanvas.height;

        // Initialize viewport
        this.viewport = {
            x: 0,
            y: 0,
            width: options.viewportWidth,
            height: options.viewportHeight
        };

        // Initialize cells
        this.cells = this.initializeCells(options.worldWidth, options.worldHeight);
        this.dirtyRects = new Set();

        // Set up font
        this.setupFont(options.defaultFont, options.customFont);

        this.metrics = {
            lastRenderTime: 0,
            averageRenderTime: 0,
            dirtyRectCount: 0,
            dirtyRectPixels: 0,
            totalRenderCalls: 0,
            fps: 0,
            lastFpsUpdate: performance.now(),
            frameCount: 0
        };

        console.log('MatrixDisplay initialization complete');
    }

    private initializeCells(width: number, height: number): Cell[][] {
        const cells: Cell[][] = [];
        for (let y = 0; y < height; y++) {
            cells[y] = [];
            for (let x = 0; x < width; x++) {
                cells[y][x] = {
                    overlay: '#00000000',
                    tiles: [],
                    background: {
                        symbol: '.',
                        fgColor: '#AAAAAAFF',
                        bgColor: '#000000FF'
                    },
                    isDirty: true
                };
            }
        }
        return cells;
    }

    private setupFont(defaultFont?: string, customFont?: string) {
        const fontFamily = customFont || defaultFont || 'monospace';
        this.displayCtx.font = `${this.cellSize}px ${fontFamily}`;
        this.worldCtx.font = `${this.cellSize}px ${fontFamily}`;
        this.displayCtx.textAlign = 'center';
        this.displayCtx.textBaseline = 'middle';
        this.worldCtx.textAlign = 'center';
        this.worldCtx.textBaseline = 'middle';
    }

    public setTile(x: number, y: number, tile: Tile) {
        console.log(`Setting tile at (${x},${y}):`, tile);
        const cell = this.cells[y][x];
        
        // Find the correct position to insert the tile based on z-index
        const insertIndex = cell.tiles.findIndex(t => t.zIndex <= tile.zIndex);
        if (insertIndex === -1) {
            cell.tiles.push(tile);
        } else {
            cell.tiles.splice(insertIndex, 0, tile);
        }
        
        cell.isDirty = true;
        this.dirtyRects.add(`${x},${y}`);
    }

    public setOverlay(x: number, y: number, color: Color) {
        this.cells[y][x].overlay = color;
        this.cells[y][x].isDirty = true;
        this.dirtyRects.add(`${x},${y}`);
    }

    public setViewport(x: number, y: number) {
        this.viewport.x = Math.max(0, Math.min(x, this.worldCanvas.width - this.viewport.width));
        this.viewport.y = Math.max(0, Math.min(y, this.worldCanvas.height - this.viewport.height));
        this.render(); // Full render needed when viewport changes
    }

    private renderCell(x: number, y: number) {
        const cell = this.cells[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        // Compute final appearance
        let finalSymbol = cell.background.symbol;
        let finalFgColor = cell.background.fgColor;
        let finalBgColor = cell.background.bgColor;

        // Apply tiles in z-order
        for (const tile of cell.tiles) {
            if (tile.symbol) finalSymbol = tile.symbol;
            if (tile.fgColor) finalFgColor = tile.fgColor;
            if (tile.bgColor) finalBgColor = tile.bgColor;
        }

        // Draw to world buffer
        this.worldCtx.fillStyle = finalBgColor;
        this.worldCtx.fillRect(px, py, this.cellSize, this.cellSize);

        if (this.cellSize >= 10) {
            this.worldCtx.fillStyle = finalFgColor;
            this.worldCtx.fillText(
                finalSymbol,
                px + this.cellSize / 2,
                py + this.cellSize / 2
            );
        }

        // Apply overlay
        if (cell.overlay !== '#00000000') {
            this.worldCtx.fillStyle = cell.overlay;
            this.worldCtx.fillRect(px, py, this.cellSize, this.cellSize);
        }

        cell.isDirty = false;
    }

    public render() {
        console.log(`Rendering frame. Dirty rects: ${this.dirtyRects.size}`);
        const renderStart = performance.now();
        this.metrics.totalRenderCalls++;
        this.metrics.frameCount++;
        
        if (this.dirtyRects.size === 0) {
            this.updateMetrics(renderStart);
            return;
        }

        // Track metrics for this render
        this.metrics.dirtyRectCount = this.dirtyRects.size;

        // Calculate the bounds of dirty rectangles in world coordinates
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        for (const key of this.dirtyRects) {
            const [x, y] = key.split(',').map(Number);
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + 1); // +1 because we want the right/bottom edge
            maxY = Math.max(maxY, y + 1);
        }

        // Render dirty cells to world buffer
        for (const key of this.dirtyRects) {
            const [x, y] = key.split(',').map(Number);
            this.renderCell(x, y);
        }
        this.dirtyRects.clear();

        // Convert world coordinates to viewport-relative coordinates
        const viewMinX = Math.max(0, minX - this.viewport.x);
        const viewMinY = Math.max(0, minY - this.viewport.y);
        const viewMaxX = Math.min(this.viewport.width, maxX - this.viewport.x);
        const viewMaxY = Math.min(this.viewport.height, maxY - this.viewport.y);

        // If the dirty region is completely outside viewport, we're done
        if (viewMaxX <= 0 || viewMaxY <= 0 || 
            viewMinX >= this.viewport.width || viewMinY >= this.viewport.height) {
            return;
        }

        // Calculate pixel coordinates and dimensions for the dirty region
        const srcX = (Math.max(this.viewport.x, minX)) * this.cellSize;
        const srcY = (Math.max(this.viewport.y, minY)) * this.cellSize;
        const srcWidth = (viewMaxX - viewMinX) * this.cellSize;
        const srcHeight = (viewMaxY - viewMinY) * this.cellSize;
        const destX = viewMinX * this.cellSize;
        const destY = viewMinY * this.cellSize;

        // Clear only the affected region in the render buffer
        this.renderCtx.clearRect(destX, destY, srcWidth, srcHeight);

        // Copy only the dirty region from world buffer to render buffer
        this.renderCtx.drawImage(
            this.worldCanvas,
            srcX, srcY, srcWidth, srcHeight,  // Source rectangle
            destX, destY, srcWidth, srcHeight // Destination rectangle
        );

        // Copy only the affected region to the display canvas
        this.displayCtx.clearRect(destX, destY, srcWidth, srcHeight);
        this.displayCtx.drawImage(
            this.renderCanvas,
            destX, destY, srcWidth, srcHeight,  // Source rectangle
            destX, destY, srcWidth, srcHeight   // Destination rectangle
        );

        this.updateMetrics(renderStart);
    }

    private updateMetrics(renderStart: number) {
        // Update render time metrics
        const renderTime = performance.now() - renderStart;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 
            (this.metrics.totalRenderCalls - 1) + renderTime) / this.metrics.totalRenderCalls;

        // Update FPS every second
        const now = performance.now();
        const elapsed = now - this.metrics.lastFpsUpdate;
        if (elapsed >= 1000) {
            this.metrics.fps = (this.metrics.frameCount / elapsed) * 1000;
            this.metrics.frameCount = 0;
            this.metrics.lastFpsUpdate = now;
        }
    }

    public getPerformanceMetrics(): Readonly<PerformanceMetrics> {
        return { ...this.metrics };
    }

    public getDebugString(): string {
        return `FPS: ${this.metrics.fps.toFixed(1)}
Render Time: ${this.metrics.lastRenderTime.toFixed(2)}ms (avg: ${this.metrics.averageRenderTime.toFixed(2)}ms)
Dirty Rects: ${this.metrics.dirtyRectCount}
Affected Pixels: ${this.metrics.dirtyRectPixels.toLocaleString()}`;
    }
} 