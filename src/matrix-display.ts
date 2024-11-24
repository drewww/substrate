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

export interface MatrixDisplayConfig {
    elementId: string;
    cellSize: number;
    worldWidth: number;
    worldHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    defaultFont?: string;
    customFont?: string;
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

    private worldWidth: number;
    private worldHeight: number;
    private readonly scale: number;

    constructor(options: DisplayOptions) {
        console.log('Initializing MatrixDisplay with options:', options);
        
        // Calculate DPI scale first
        this.scale = window.devicePixelRatio || 1;
        
        // Initialize dimensions
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.cellSize = options.cellSize;
        
        // Main display canvas
        this.displayCanvas = document.getElementById(options.elementId) as HTMLCanvasElement;
        if (!this.displayCanvas) {
            throw new Error(`Canvas element not found: ${options.elementId}`);
        }

        // Get display context first
        this.displayCtx = this.displayCanvas.getContext('2d')!;
        
        // Create buffer canvases and contexts
        this.worldCanvas = document.createElement('canvas');
        this.worldCtx = this.worldCanvas.getContext('2d')!;
        
        this.renderCanvas = document.createElement('canvas');
        this.renderCtx = this.renderCanvas.getContext('2d')!;

        // Calculate pixel dimensions
        const displayWidth = options.viewportWidth * options.cellSize;
        const displayHeight = options.viewportHeight * options.cellSize;

        // Set both CSS and canvas dimensions for all canvases
        [this.displayCanvas, this.worldCanvas, this.renderCanvas].forEach(canvas => {
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            canvas.width = displayWidth * this.scale;
            canvas.height = displayHeight * this.scale;
        });

        // Scale all contexts for DPI
        [this.displayCtx, this.worldCtx, this.renderCtx].forEach(ctx => {
            ctx.scale(this.scale, this.scale);
        });

        // Set dimensions
        this.cellSize = options.cellSize * this.scale;
        
        // Display canvas is viewport size
        this.displayCanvas.width = options.viewportWidth * this.cellSize;
        this.displayCanvas.height = options.viewportHeight * this.cellSize;
        
        // World buffer is full world size
        this.worldCanvas.width = options.worldWidth * this.cellSize;
        this.worldCanvas.height = options.worldHeight * this.cellSize;
        
        // Render buffer matches display size
        this.renderCanvas.width = this.displayCanvas.width;
        this.renderCanvas.height = this.displayCanvas.height;

        // Set CSS size (logical pixels)
        this.displayCanvas.style.width = `${options.viewportWidth * options.cellSize}px`;
        this.displayCanvas.style.height = `${options.viewportHeight * options.cellSize}px`;

        // Disable smoothing on all contexts
        [this.displayCtx, this.worldCtx, this.renderCtx].forEach(ctx => {
            ctx.imageSmoothingEnabled = false;
            // @ts-ignore (textRendering might not be in types)
            ctx.textRendering = 'geometricPrecision';
        });

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

        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;

        // Set up font
        this.setupFont(options.defaultFont, options.customFont);

        // Initialize metrics with safe default values
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
        const fontSize = Math.floor(this.cellSize * 0.8);
        
        [this.displayCtx, this.worldCtx, this.renderCtx].forEach(ctx => {
            ctx.font = `normal normal ${fontSize}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fontKerning = 'none';
            // @ts-ignore (textRendering might not be in types)
            ctx.textRendering = 'geometricPrecision';
        });
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
        // Add bounds checking
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            console.warn(`Attempted to set overlay outside world bounds: (${x},${y})`);
            return;
        }

        this.cells[y][x].overlay = color;
        this.cells[y][x].isDirty = true;
        this.dirtyRects.add(`${x},${y}`);
    }

    public setViewport(x: number, y: number) {
        console.log(`Setting viewport to (${x},${y})`);
                
        // Update viewport position
        this.viewport.x = Math.max(0, Math.min(x, this.worldCanvas.width / this.cellSize - this.viewport.width));
        this.viewport.y = Math.max(0, Math.min(y, this.worldCanvas.height / this.cellSize - this.viewport.height));

        // Mark all viewport cells as dirty since we need to redraw everything
        for (let vy = 0; vy < this.viewport.height; vy++) {
            for (let vx = 0; vx < this.viewport.width; vx++) {
                const worldX = vx + this.viewport.x;
                const worldY = vy + this.viewport.y;
                this.dirtyRects.add(`${worldX},${worldY}`);
            }
        }

        // Force immediate render since viewport changed
        this.render();
    }

    private renderCell(x: number, y: number): void {
        const cell = this.cells[y][x];
        
        // Calculate pixel coordinates
        const pixelX = x * this.cellSize;
        const pixelY = y * this.cellSize;
        
        // Save context state
        this.worldCtx.save();
        
        // Create clipping path for this cell
        this.worldCtx.beginPath();
        this.worldCtx.rect(pixelX, pixelY, this.cellSize, this.cellSize);
        this.worldCtx.clip();
        
        // Clear the cell area
        this.worldCtx.clearRect(pixelX, pixelY, this.cellSize, this.cellSize);
        
        // Draw background if specified
        if (cell.background) {
            this.worldCtx.fillStyle = cell.background.bgColor;
            this.worldCtx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
        }
        
        // Draw tiles in order
        cell.tiles.forEach(tile => {
            // Draw background if specified
            if (tile.bgColor) {
                this.worldCtx.fillStyle = tile.bgColor;
                this.worldCtx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
            }
            
            // Draw symbol if specified
            if (tile.symbol && tile.fgColor) {
                this.worldCtx.fillStyle = tile.fgColor;
                this.worldCtx.font = `${this.cellSize}px monospace`;
                this.worldCtx.textAlign = 'center';
                this.worldCtx.textBaseline = 'middle';
                this.worldCtx.fillText(
                    tile.symbol,
                    pixelX + (this.cellSize / 2),
                    pixelY + (this.cellSize / 2)
                );
            }
        });
        
        // Draw overlay if specified
        if (cell.overlay && cell.overlay !== '#00000000') {
            this.worldCtx.fillStyle = cell.overlay;
            this.worldCtx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
        }
        
        // Restore context state (removes clipping)
        this.worldCtx.restore();
    }

    public render(): void {
        const renderStart = performance.now();
        console.log('Starting render, dirty rects:', this.dirtyRects.size);

        if (this.dirtyRects.size === 0) {
            console.log('No dirty rects, skipping render');
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
            maxX = Math.max(maxX, x + 1);
            maxY = Math.max(maxY, y + 1);
        }

        console.log(`Dirty rect bounds: (${minX},${minY}) to (${maxX},${maxY})`);

        // Render dirty cells to world buffer
        for (const key of this.dirtyRects) {
            const [x, y] = key.split(',').map(Number);
            this.renderCell(x, y);
        }
        console.log('Rendered dirty cells');
        this.dirtyRects.clear();

        // Copy to display
        console.log('Copying to display canvas');
        const srcX = this.viewport.x * this.cellSize;
        const srcY = this.viewport.y * this.cellSize;
        const srcWidth = this.viewport.width * this.cellSize;
        const srcHeight = this.viewport.height * this.cellSize;

        // Clear the display canvas
        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);

        // Copy from world buffer to display canvas
        this.displayCtx.drawImage(
            this.worldCanvas,
            srcX, srcY, srcWidth, srcHeight,  // Source rectangle
            0, 0, srcWidth, srcHeight         // Destination rectangle
        );

        this.updateMetrics(renderStart);
    }

    private updateMetrics(renderStart: number) {
        const renderTime = performance.now() - renderStart;
        this.metrics.lastRenderTime = renderTime;
        
        // Update average render time
        if (this.metrics.totalRenderCalls === 0) {
            this.metrics.averageRenderTime = renderTime;
        } else {
            this.metrics.averageRenderTime = (
                (this.metrics.averageRenderTime * this.metrics.totalRenderCalls + renderTime) / 
                (this.metrics.totalRenderCalls + 1)
            );
        }
        
        this.metrics.totalRenderCalls++;
        this.metrics.frameCount++;

        // Update FPS every second
        const now = performance.now();
        const timeSinceLastUpdate = now - this.metrics.lastFpsUpdate;
        if (timeSinceLastUpdate >= 1000) {
            this.metrics.fps = (this.metrics.frameCount / timeSinceLastUpdate) * 1000;
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

    public clear() {
        console.log('Clearing display');
        
        // Clear all cells back to default state
        for (let y = 0; y < this.cells.length; y++) {
            for (let x = 0; x < this.cells[y].length; x++) {
                this.cells[y][x] = {
                    overlay: '#00000000',
                    tiles: [],
                    background: {
                        symbol: '.',
                        fgColor: '#AAAAAAFF',
                        bgColor: '#000000FF'
                    },
                    isDirty: true
                };
                this.dirtyRects.add(`${x},${y}`);
            }
        }

        // Clear all canvases
        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
        this.renderCtx.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

        // Render the cleared state
        this.render();
    }

    public setTiles(x: number, y: number, tiles: Tile[]) {
        this.cells[y][x].tiles = tiles;
        this.cells[y][x].isDirty = true;
        this.dirtyRects.add(`${x},${y}`);
    }

    public clearOverlays() {
        console.log('Clearing all overlays');
        for (let y = 0; y < this.cells.length; y++) {
            for (let x = 0; x < this.cells[y].length; x++) {
                this.cells[y][x].overlay = '#00000000';
                this.cells[y][x].isDirty = true;
                this.dirtyRects.add(`${x},${y}`);
            }
        }
        this.render();
    }

    public getCell(x: number, y: number): Cell | null {
        if (x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight) {
            return this.cells[y][x];
        }
        return null;
    }

    public getWorldWidth(): number {
        return this.worldWidth;
    }

    public getWorldHeight(): number {
        return this.worldHeight;
    }

    public getViewportWidth(): number {
        return this.viewport.width;
    }

    public getViewportHeight(): number {
        return this.viewport.height;
    }
} 