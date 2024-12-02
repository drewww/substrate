import { TextParser } from './text-parser';
import { Color, Tile, TileId, Viewport, SymbolAnimation, ColorAnimation, ValueAnimation, EasingFunction, ColorAnimationOptions, TileConfig } from './types';

interface PerformanceMetrics {
    lastRenderTime: number;
    averageRenderTime: number;
    totalRenderCalls: number;
    fps: number;
    lastFpsUpdate: number;
    frameCount: number;
    symbolAnimationCount: number;
    colorAnimationCount: number;
    valueAnimationCount: number;
    lastAnimationUpdateTime: number;
    lastWorldUpdateTime: number;
    averageAnimationTime: number;
    averageWorldUpdateTime: number;
}

export enum LogLevel {
    NONE = 0,
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4,
    VERBOSE = 5
}

export interface DisplayConfig {
    elementId?: string;
    cellWidth: number;
    cellHeight: number;
    worldWidth: number;
    worldHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    defaultFont?: string;
    customFont?: string;
    logLevel?: LogLevel;
}

export interface StringConfig {
    text: string;
    options?: {
        zIndex?: number;
        backgroundColor?: string;
        textBackgroundColor?: string;
        fillBox?: boolean;
        padding?: number;
    };
}

export enum FillDirection {
    TOP,
    RIGHT,
    BOTTOM,
    LEFT
}

export const Easing = {
    // Linear (no easing)
    linear: (t: number): number => t,
    
    // Sine
    sineIn: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),
    sineOut: (t: number): number => Math.sin((t * Math.PI) / 2),
    sineInOut: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
    
    // Quadratic
    quadIn: (t: number): number => t * t,
    quadOut: (t: number): number => 1 - (1 - t) * (1 - t),
    quadInOut: (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
    
    // Cubic
    cubicIn: (t: number): number => t * t * t,
    cubicOut: (t: number): number => 1 - Math.pow(1 - t, 3),
    cubicInOut: (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    
    // Exponential
    expoIn: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
    expoOut: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
    expoInOut: (t: number): number => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },
    
    // Bounce
    bounceOut: (t: number): number => {
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    bounceIn: (t: number): number => 1 - Easing.bounceOut(1 - t),
    bounceInOut: (t: number): number => 
        t < 0.5 ? (1 - Easing.bounceOut(1 - 2 * t)) / 2 : (1 + Easing.bounceOut(2 * t - 1)) / 2
};

export interface ValueAnimationConfig {
    start: number;
    end: number;
    duration: number;
    reverse?: boolean;
    offset?: number;
    easing?: EasingFunction;
    loop?: boolean;
}

export interface ValueAnimationOptions {
    bgPercent?: ValueAnimationConfig;
    offsetSymbolX?: ValueAnimationConfig;
    offsetSymbolY?: ValueAnimationConfig;
    scaleSymbolX?: ValueAnimationConfig;
    scaleSymbolY?: ValueAnimationConfig;
    x?: ValueAnimationConfig;
    y?: ValueAnimationConfig;
    startTime?: number;
}

export class Display {
    private displayCanvas: HTMLCanvasElement;    // The canvas shown to the user
    private displayCtx: CanvasRenderingContext2D;
    private worldCanvas: HTMLCanvasElement;      // Full world buffer
    private worldCtx: CanvasRenderingContext2D;
    private viewport: Viewport;
    private metrics: PerformanceMetrics;

    private worldWidth: number;
    private worldHeight: number;
    private readonly scale: number;
    private tileMap: Map<TileId, Tile> = new Map();
    private tileIdCounter: number = 0;
    private logLevel: LogLevel;
    private textParser: TextParser;

    private boundRenderFrame: (timestamp: number) => void;
    private isRunning: boolean = false;
    private animations: Map<TileId, SymbolAnimation> = new Map();
    private colorAnimations: Map<TileId, {fg?: ColorAnimation, bg?: ColorAnimation}> = new Map();
    private valueAnimations: Map<TileId, {
        bgPercent?: ValueAnimation,
        x?: ValueAnimation,
        y?: ValueAnimation,
        offsetSymbolX?: ValueAnimation,
        offsetSymbolY?: ValueAnimation,
        scaleSymbolX?: ValueAnimation,
        scaleSymbolY?: ValueAnimation
    }> = new Map();

    private hasChanges: boolean = true;
    private cellWidthCSS: number;
    private cellHeightCSS: number;
    private cellWidthScaled: number;
    private cellHeightScaled: number;

    constructor(options: DisplayConfig) {
        this.logLevel = options.logLevel ?? LogLevel.WARN;
        
        this.log.info('Initializing Display with options:', options);
        
        // Calculate DPI scale first
        this.scale = window.devicePixelRatio || 1;
        
        // Initialize dimensions
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;

        // this is in pixels, with no scale applied. 
        // we will update this with scale later on.
        // this is confusing because 
        this.cellWidthCSS = options.cellWidth;
        this.cellHeightCSS = options.cellHeight;
        
        // Main display canvas
        if (!options.elementId) {
            this.log.error('elementId is required');
            throw new Error('elementId is required in DisplayConfig');
        }
        
        this.displayCanvas = document.getElementById(options.elementId) as HTMLCanvasElement;
        if (!this.displayCanvas) {
            this.log.error(`Canvas element not found: ${options.elementId}`);
            throw new Error(`Canvas element not found: ${options.elementId}`);
        }

        // Get display context first
        this.displayCtx = this.displayCanvas.getContext('2d')!;
        
        // Create buffer canvases and contexts
        this.worldCanvas = document.createElement('canvas');
        this.worldCtx = this.worldCanvas.getContext('2d')!;

        // Calculate pixel dimensions
        const displayWidth = options.viewportWidth * this.cellWidthCSS;
        const displayHeight = options.viewportHeight * this.cellHeightCSS;

        // Set dimensions for display and world canvases only
        [this.displayCanvas, this.worldCanvas].forEach(canvas => {
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            canvas.width = displayWidth * this.scale;
            canvas.height = displayHeight * this.scale;
        });

        // Scale contexts for DPI
        [this.displayCtx, this.worldCtx].forEach(ctx => {
            ctx.scale(this.scale, this.scale);
        });

        // Set dimensions
        // This is the moment scale comes in. We will change this to pull directly from options later.
        this.cellWidthScaled = options.cellWidth * this.scale;
        this.cellHeightScaled = options.cellHeight * this.scale;
        
        // Display canvas is viewport size
        this.displayCanvas.width = options.viewportWidth * this.cellWidthScaled;
        this.displayCanvas.height = options.viewportHeight * this.cellHeightScaled;
        
        // World buffer is full world size
        this.worldCanvas.width = options.worldWidth * this.cellWidthScaled;
        this.worldCanvas.height = options.worldHeight * this.cellHeightScaled;
        
        // Set CSS size (logical pixels)
        this.displayCanvas.style.width = `${options.viewportWidth * this.cellWidthCSS}px`;
        this.displayCanvas.style.height = `${options.viewportHeight * this.cellHeightCSS}px`;

        // Disable smoothing on all contexts
        [this.displayCtx, this.worldCtx].forEach(ctx => {
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

        // Set up font
        this.setupFont(options.defaultFont, options.customFont);

        // Initialize metrics with safe default values
        this.metrics = {
            lastRenderTime: 0,
            averageRenderTime: 0,
            totalRenderCalls: 0,
            fps: 0,
            lastFpsUpdate: performance.now(),
            frameCount: 0,
            symbolAnimationCount: 0,
            colorAnimationCount: 0,
            valueAnimationCount: 0,
            lastAnimationUpdateTime: 0,
            lastWorldUpdateTime: 0,
            averageAnimationTime: 0,
            averageWorldUpdateTime: 0
        };

        // Initialize parser with standard color map
        this.textParser = new TextParser({
            'r': '#FF0000FF',  // red
            'g': '#00FF00FF',  // green
            'b': '#0088FFFF',  // blue
            'y': '#FFFF00FF',  // yellow
            'm': '#FF00FFFF',  // magenta
            'w': '#FFFFFFFF',  // white
        });

        this.log.info('Display initialization complete');

        this.boundRenderFrame = this.renderFrame.bind(this);
        this.startRenderLoop();
    }

    private setupFont(defaultFont?: string, customFont?: string) {
        const fontFamily = customFont || defaultFont || 'monospace';
        const fontSize = Math.floor(this.cellHeightScaled * 0.8);
        
        [this.displayCtx, this.worldCtx].forEach(ctx => {
            ctx.font = `normal normal ${fontSize}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fontKerning = 'none';
            // @ts-ignore (textRendering might not be in types)
            ctx.textRendering = 'geometricPrecision';
        });
    }

    public createTile(
        x: number, 
        y: number, 
        char: string, 
        color: Color, 
        backgroundColor: Color,
        zIndex: number = 1,
        config?: TileConfig
    ): TileId {
        this.hasChanges = true;
        const id = this.generateTileId();
        this.log.verbose(`Creating tile ${id} at (${x},${y})`);
        const tile: Tile = {
            id,
            x,
            y,
            char,
            color,
            backgroundColor,
            zIndex,
            bgPercent: config?.bgPercent ?? 1,
            fillDirection: config?.fillDirection ?? FillDirection.BOTTOM,
            offsetSymbolX: 0,
            offsetSymbolY: 0,
            scaleSymbolX: 1.0,
            scaleSymbolY: 1.0,
            noClip: config?.noClip ?? false
        };
        
        this.tileMap.set(id, tile);
        return id;
    }

    public moveTile(tileId: TileId, newX: number, newY: number): void {
        const tile = this.tileMap.get(tileId);
        if (tile && (tile.x !== newX || tile.y !== newY)) {
            this.hasChanges = true;
            if (!tile) {
                this.log.warn(`Attempted to move non-existent tile: ${tileId}`);
                return;
            }

            if (newX < 0 || newX >= this.worldWidth || newY < 0 || newY >= this.worldHeight) {
                this.log.warn(`Attempted to move tile outside bounds: (${newX},${newY})`);
                return;
            }

            this.log.verbose(`Moving tile ${tileId} to (${newX},${newY})`);
            tile.x = newX;
            tile.y = newY;
        }
    }

    public removeTile(tileId: TileId): void {
        if (this.tileMap.has(tileId)) {
            this.hasChanges = true;
            if (!this.tileMap.has(tileId)) {
                this.log.warn(`Attempted to remove non-existent tile: ${tileId}`);
                return;
            }
            
            this.log.verbose(`Removing tile ${tileId}`);
            this.animations.delete(tileId);
            this.tileMap.delete(tileId);
        }
    }

    private updateWorldCanvas(): void {
        // Clear the world canvas
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
        
        // Sort all tiles by z-index once per frame
        const sortedTiles = Array.from(this.tileMap.values())
            .sort((a, b) => a.zIndex - b.zIndex);

        // Render each tile
        sortedTiles.forEach(tile => {
            this.renderTile(tile);
        });
    }

    private renderTile(tile: Tile): void {
        const pixelX = tile.x * this.cellWidthScaled;
        const pixelY = tile.y * this.cellHeightScaled;
        
        this.worldCtx.save();
        this.worldCtx.translate(pixelX, pixelY);
        
        // Only create clipping path if noClip is false or undefined
        if (!tile.noClip) {
            this.worldCtx.beginPath();
            this.worldCtx.rect(0, 0, this.cellWidthScaled, this.cellHeightScaled);
            this.worldCtx.clip();
        }
        
        // Draw background if it has one
        if (tile.backgroundColor && tile.backgroundColor !== '#00000000') {
            const bgPercent = tile.bgPercent ?? 1;
            if (bgPercent > 0) {
                this.worldCtx.fillStyle = tile.backgroundColor;
                const cellWidth = this.cellWidthScaled;
                const cellHeight = this.cellHeightScaled;

                switch (tile.fillDirection) {
                    case FillDirection.TOP:
                        this.worldCtx.fillRect(
                            0,
                            0,
                            cellWidth,
                            cellHeight * bgPercent
                        );
                        break;
                    case FillDirection.RIGHT:
                        this.worldCtx.fillRect(
                            0 + cellWidth * (1 - bgPercent),
                            0,
                            cellWidth * bgPercent,
                            cellHeight
                        );
                        break;
                    case FillDirection.BOTTOM:
                        this.worldCtx.fillRect(
                            0,
                            0 + cellHeight * (1 - bgPercent),
                            cellWidth,
                            cellHeight * bgPercent
                        );
                        break;
                    case FillDirection.LEFT:
                        this.worldCtx.fillRect(
                            0,
                            0,
                            cellWidth * bgPercent,
                            cellHeight
                        );
                        break;
                }
            }
        }
        
        // Draw character
        if (tile.char && tile.color) {
            const offsetX = (tile.offsetSymbolX || 0) * this.cellWidthScaled;
            const offsetY = (tile.offsetSymbolY || 0) * this.cellHeightScaled;
            
            this.worldCtx.save();
            
            // Move to cell location.

            this.worldCtx.translate(this.cellWidthScaled/2, this.cellHeightScaled * 0.55);
            
            // Apply scaling
            this.worldCtx.scale(tile.scaleSymbolX, tile.scaleSymbolY);
            
            // Apply offset after scaling
            this.worldCtx.translate(offsetX, offsetY);
            
            // Draw character at origin (0,0) since we've translated
            this.worldCtx.fillStyle = tile.color;
            this.worldCtx.fillText(tile.char, 0, 0);
            
            this.worldCtx.restore();
        }

        this.worldCtx.restore();
    }

    private renderFrame(timestamp: number): void {
        const animationStart = performance.now();
        
        // Check if we have any active animations
        const hasActiveAnimations = 
            this.animations.size > 0 || 
            this.colorAnimations.size > 0 || 
            this.valueAnimations.size > 0;

        if (hasActiveAnimations) {
            this.updateAnimations(timestamp);
            this.updateColorAnimations(timestamp);
            this.updateValueAnimations(timestamp);
            this.hasChanges = true;
        }
        
        const animationEnd = performance.now();
        const renderStart = animationEnd;

        // Only update canvases if we have changes
        if (this.hasChanges) {
            this.updateWorldCanvas();
            this.hasChanges = false;
        }
        
        this.updateDisplayCanvas();

        const renderEnd = performance.now();

        // Update animation counts
        this.metrics.symbolAnimationCount = this.animations.size;
        this.metrics.colorAnimationCount = this.colorAnimations.size;
        this.metrics.valueAnimationCount = this.valueAnimations.size;
        
        // Update timing metrics
        this.metrics.lastAnimationUpdateTime = animationEnd - animationStart;
        this.metrics.lastWorldUpdateTime = renderEnd - renderStart;
        
        // Update averages
        if (this.metrics.totalRenderCalls === 0) {
            this.metrics.averageAnimationTime = this.metrics.lastAnimationUpdateTime;
            this.metrics.averageWorldUpdateTime = this.metrics.lastWorldUpdateTime;
        } else {
            this.metrics.averageAnimationTime = (
                (this.metrics.averageAnimationTime * this.metrics.totalRenderCalls + this.metrics.lastAnimationUpdateTime) /
                (this.metrics.totalRenderCalls + 1)
            );
            this.metrics.averageWorldUpdateTime = (
                (this.metrics.averageWorldUpdateTime * this.metrics.totalRenderCalls + this.metrics.lastWorldUpdateTime) /
                (this.metrics.totalRenderCalls + 1)
            );
        }

        this.updateMetrics(renderStart);

        if (this.isRunning) {
            requestAnimationFrame(this.boundRenderFrame);
        }
    }

    private startRenderLoop() {
        if (!this.isRunning) {
            this.isRunning = true;
            requestAnimationFrame(this.boundRenderFrame);
        }
    }

    private updateDisplayCanvas() {
        const srcX = this.viewport.x * this.cellWidthScaled;
        const srcY = this.viewport.y * this.cellHeightScaled;
        const srcWidth = this.viewport.width * this.cellWidthScaled;
        const srcHeight = this.viewport.height * this.cellHeightScaled;

        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
        this.displayCtx.drawImage(
            this.worldCanvas,
            srcX, srcY, srcWidth, srcHeight,
            0, 0, srcWidth, srcHeight
        );
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
├─ Animation: ${this.metrics.lastAnimationUpdateTime.toFixed(2)}ms (avg: ${this.metrics.averageAnimationTime.toFixed(2)}ms)
└─ World Update: ${this.metrics.lastWorldUpdateTime.toFixed(2)}ms (avg: ${this.metrics.averageWorldUpdateTime.toFixed(2)}ms)
Active Animations: ${this.metrics.symbolAnimationCount + this.metrics.colorAnimationCount + this.metrics.valueAnimationCount}
├─ Symbol: ${this.metrics.symbolAnimationCount}
├─ Color: ${this.metrics.colorAnimationCount}
└─ Value: ${this.metrics.valueAnimationCount}`;
    }

    public clear() {
        this.hasChanges = true;
        this.log.info('Clearing display');
        
        // Clear all tiles
        this.tileMap.clear();
        this.animations.clear();
        this.colorAnimations.clear();
        this.valueAnimations.clear();

        // Clear all canvases
        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
    }

    public setBackground(symbol: string, fgColor: Color, bgColor: Color): void {
        // Remove existing background tiles
        const existingBackgroundTiles = Array.from(this.tileMap.values())
            .filter(tile => tile.zIndex === -1)
            .map(tile => tile.id);
        existingBackgroundTiles.forEach(id => this.removeTile(id));

        // Create new background tiles
        for (let y = 0; y < this.worldHeight; y++) {
            for (let x = 0; x < this.worldWidth; x++) {
                this.createTile(
                    x,
                    y,
                    symbol,
                    fgColor,
                    bgColor,
                    -1  // z-index
                );
            }
        }
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

    private generateTileId(): TileId {
        // Format: t_[timestamp]_[counter]
        const timestamp = Date.now();
        const id = `t_${timestamp}_${this.tileIdCounter++}`;
        return id;
    }

    public getTile(tileId: TileId): Tile | undefined {
        return this.tileMap.get(tileId);
    }

    public setLogLevel(level: LogLevel): void {
        this.log.info(`Changing log level from ${LogLevel[this.logLevel]} to ${LogLevel[level]}`);
        this.logLevel = level;
    }

    public log = {
        error: (...args: any[]) => {
            if (this.logLevel >= LogLevel.ERROR) console.error('[Display]', ...args);
        },
        warn: (...args: any[]) => {
            if (this.logLevel >= LogLevel.WARN) console.warn('[Display]', ...args);
        },
        info: (...args: any[]) => {
            if (this.logLevel >= LogLevel.INFO) console.log('[Display]', ...args);
        },
        debug: (...args: any[]) => {
            if (this.logLevel >= LogLevel.DEBUG) console.log('[Display][Debug]', ...args);
        },
        verbose: (...args: any[]) => {
            if (this.logLevel >= LogLevel.VERBOSE) console.log('[Display][Verbose]', ...args);
        }
    };

    public createString(
        x: number,
        y: number,
        text: string,
        zIndex: number = 1
    ): TileId[] {
        const segments = this.textParser.parse(text);
        const tileIds: TileId[] = [];
        let currentX = x;

        segments.forEach(segment => {
            Array.from(segment.text).forEach(char => {
                const tileId = this.createTile(
                    currentX++,
                    y,
                    char,
                    segment.color,
                    "#000000FF",  // Default background
                    zIndex
                );
                tileIds.push(tileId);
            });
        });

        return tileIds;
    }

    public createWrappedString(
        x: number,
        y: number,
        width: number,
        height: number,
        text: string,
        options: {
            zIndex?: number;
            backgroundColor?: string;
            textBackgroundColor?: string;
            fillBox?: boolean;
            padding?: number;
        } = {}
    ): TileId[] {
        const {
            zIndex = 1,
            backgroundColor = '#00000000',
            textBackgroundColor = '#00000000',
            fillBox = false,
            padding = 0
        } = options;

        const tileIds: TileId[] = [];
        
        const actualX = x - padding;
        const actualY = y - padding;
        const actualWidth = width + padding * 2;
        const actualHeight = height + padding * 2;
        
        // Create background if requested
        if (fillBox) {
            for (let py = actualY; py < actualY + actualHeight; py++) {
                for (let px = actualX; px < actualX + actualWidth; px++) {
                    const tileId = this.createTile(
                        px,
                        py,
                        ' ',  // Empty space for background
                        '#00000000',  // Transparent foreground
                        backgroundColor,
                        zIndex - 1  // Place background behind text
                    );
                    tileIds.push(tileId);
                }
            }
        }

        // Create text tiles
        const segments = this.textParser.parse(text);
        let currentX = x;
        let currentY = y;
        let lineStart = x;
        let currentLineWords: { tileIds: TileId[]; text: string; }[] = [];

        segments.forEach(segment => {
            const words = segment.text.split(/(\s+)/);
            
            words.forEach(word => {
                if (!word.length) return;

                const wordTileIds: TileId[] = [];
                Array.from(word).forEach(char => {
                    const tileId = this.createTile(
                        currentX + wordTileIds.length,
                        currentY,
                        char,
                        segment.color,
                        textBackgroundColor,
                        zIndex
                    );
                    wordTileIds.push(tileId);
                });

                // Check if adding this word would exceed the width
                if (currentX - lineStart + word.length > width && currentLineWords.length > 0) {
                    // Move to next line
                    currentY++;
                    currentX = x;
                    lineStart = x;

                    // Reset line tracking
                    currentLineWords = [];
                }

                // Move word to current position
                wordTileIds.forEach((tileId, i) => {
                    this.moveTile(tileId, currentX + i, currentY);
                });

                // Add to tracking
                currentLineWords.push({ tileIds: wordTileIds, text: word });
                tileIds.push(...wordTileIds);

                // Update position for next word
                currentX += word.length;
            });
        });
        
        return tileIds;
    }

    public emptyCell(x: number, y: number): void {
        if (x < 0 || x >= this.worldWidth || y < 0 || y >= this.worldHeight) {
            this.log.warn(`Attempted to empty cell outside world bounds: (${x},${y})`);
            return;
        }

        // Find and remove all tiles at the specified position
        const tilesToRemove = Array.from(this.tileMap.values())
            .filter(tile => tile.x === x && tile.y === y)
            .map(tile => tile.id);
        
        tilesToRemove.forEach(id => this.removeTile(id));
    }

    public addSymbolAnimation(
        tileId: TileId, 
        symbols: string[], 
        duration: number, 
        reverse: boolean = false, 
        offset: number = 0,
        startTime?: number
    ): void {
        if (!this.tileMap.has(tileId)) {
            this.log.warn(`Attempted to add animation to non-existent tile: ${tileId}`);
            return;
        }
        
        this.animations.set(tileId, {
            symbols,
            startTime: startTime ?? performance.now(),
            duration,
            reverse,
            offset
        });
    }

    private updateAnimations(timestamp: number): void {
        for (const [tileId, animation] of this.animations) {
            const tile = this.tileMap.get(tileId);
            if (!tile) {
                this.animations.delete(tileId);
                continue;
            }

            const elapsed = (timestamp - animation.startTime) / 1000;
            let progress = (elapsed / animation.duration) + (animation.offset || 0);
            
            if (animation.reverse) {
                progress = progress % 2;
                if (progress > 1) {
                    progress = 2 - progress;
                }
            } else {
                progress = progress % 1;
            }
            
            const index = Math.floor(progress * animation.symbols.length);
            tile.char = animation.symbols[index];
        }
    }

    private interpolateColor(start: Color, end: Color, progress: number): Color {
        const fromRGB = {
            r: parseInt(start.slice(1, 3), 16),
            g: parseInt(start.slice(3, 5), 16),
            b: parseInt(start.slice(5, 7), 16),
            a: parseInt(start.slice(7, 9), 16)
        };
        
        const toRGB = {
            r: parseInt(end.slice(1, 3), 16),
            g: parseInt(end.slice(3, 5), 16),
            b: parseInt(end.slice(5, 7), 16),
            a: parseInt(end.slice(7, 9), 16)
        };
        
        const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * progress);
        const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * progress);
        const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * progress);
        const a = Math.round(fromRGB.a + (toRGB.a - fromRGB.a) * progress);
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
    }

    private updateColorAnimations(timestamp: number): void {
        for (const [tileId, animations] of this.colorAnimations) {
            const tile = this.tileMap.get(tileId);
            if (!tile) {
                this.colorAnimations.delete(tileId);
                continue;
            }
                        
            if (animations.fg) {
                const elapsed = (timestamp - animations.fg.startTime) / 1000;
                let progress = (elapsed / animations.fg.duration) + animations.fg.offset;
                
                if (animations.fg.reverse) {
                    progress = progress % 2;
                    if (progress > 1) {
                        progress = 2 - progress;
                    }
                } else {
                    progress = progress % 1;
                }
                
                tile.color = this.interpolateColor(animations.fg.startColor, animations.fg.endColor, progress);
            }
            
            if (animations.bg) {
                const elapsed = (timestamp - animations.bg.startTime) / 1000;
                let progress = (elapsed / animations.bg.duration) + animations.bg.offset;
                
                if (animations.bg.reverse) {
                    progress = progress % 2;
                    if (progress > 1) {
                        progress = 2 - progress;
                    }
                } else {
                    progress = progress % 1;
                }
                
                tile.backgroundColor = this.interpolateColor(animations.bg.startColor, animations.bg.endColor, progress);
            }
        }
    }

    public addColorAnimation(tileId: TileId, options: ColorAnimationOptions): void {
        const animations: {fg?: ColorAnimation, bg?: ColorAnimation} = {};
        const effectiveStartTime = options.startTime ?? performance.now();
        
        if (options.fg) {
            animations.fg = {
                startColor: options.fg.start,
                endColor: options.fg.end,
                duration: options.fg.duration,
                startTime: effectiveStartTime,
                reverse: options.fg.reverse || false,
                offset: options.fg.offset || 0,
                easing: options.fg.easing
            };
        }
        
        if (options.bg) {
            animations.bg = {
                startColor: options.bg.start,
                endColor: options.bg.end,
                duration: options.bg.duration,
                startTime: effectiveStartTime,
                reverse: options.bg.reverse || false,
                offset: options.bg.offset || 0
            };
        }
        
        this.colorAnimations.set(tileId, animations);
    }

    private createValueAnimation(config: ValueAnimationConfig, startTime: number): ValueAnimation {
        return {
            startValue: config.start,
            endValue: config.end,
            duration: config.duration,
            startTime: startTime,
            reverse: config.reverse || false,
            offset: config.offset || 0,
            easing: config.easing,
            loop: config.loop ?? true
        };
    }

    public addValueAnimation(tileId: TileId, options: ValueAnimationOptions): void {
        const effectiveStartTime = options.startTime ?? performance.now();
        
        // Get existing animations or create new object
        const existingAnimations = this.valueAnimations.get(tileId) || {};
        
        // Merge new animations with existing ones
        if (options.bgPercent) {
            existingAnimations.bgPercent = this.createValueAnimation(options.bgPercent, effectiveStartTime);
        }
        if (options.offsetSymbolX) {
            existingAnimations.offsetSymbolX = this.createValueAnimation(options.offsetSymbolX, effectiveStartTime);
        }
        if (options.offsetSymbolY) {
            existingAnimations.offsetSymbolY = this.createValueAnimation(options.offsetSymbolY, effectiveStartTime);
        }
        if (options.scaleSymbolX) {
            existingAnimations.scaleSymbolX = this.createValueAnimation(options.scaleSymbolX, effectiveStartTime);
        }
        if (options.scaleSymbolY) {
            existingAnimations.scaleSymbolY = this.createValueAnimation(options.scaleSymbolY, effectiveStartTime);
        }
        if (options.x) {
            existingAnimations.x = this.createValueAnimation(options.x, effectiveStartTime);
        }
        if (options.y) {
            existingAnimations.y = this.createValueAnimation(options.y, effectiveStartTime);
        }

        // Update with merged animations
        this.valueAnimations.set(tileId, existingAnimations);
    }

    private updateValueAnimations(timestamp: number): void {
        for (const [tileId, animations] of this.valueAnimations) {
            const tile = this.tileMap.get(tileId);
            if (!tile) {
                this.valueAnimations.delete(tileId);
                continue;
            }

            // Helper function to update any value animation
            const updateAnimation = (
                animation: ValueAnimation | undefined, 
                property: 'x' | 'y' | 'scaleSymbolX' | 'scaleSymbolY' | 'offsetSymbolX' | 'offsetSymbolY' | 'bgPercent'
            ) => {
                if (!animation) return false;

                const elapsed = (timestamp - animation.startTime) / 1000;
                let progress = (elapsed / animation.duration) + animation.offset;

                if (!animation.loop && progress >= 1) {
                    // Set final value and mark for removal
                    tile[property] = animation.endValue;
                    return true; // Animation complete
                }

                if (animation.loop) {
                    if (animation.reverse) {
                        progress = progress % 2;
                        if (progress > 1) progress = 2 - progress;
                    } else {
                        progress = progress % 1;
                    }
                } else {
                    progress = Math.min(progress, 1);
                }

                const easedProgress = animation.easing ? 
                    animation.easing(progress) : 
                    progress;

                tile[property] = animation.startValue + 
                    (animation.endValue - animation.startValue) * easedProgress;
                
                return false; // Animation ongoing
            };

            // Update each animation type
            if (updateAnimation(animations.x, 'x')) delete animations.x;
            if (updateAnimation(animations.y, 'y')) delete animations.y;
            if (updateAnimation(animations.scaleSymbolX, 'scaleSymbolX')) delete animations.scaleSymbolX;
            if (updateAnimation(animations.scaleSymbolY, 'scaleSymbolY')) delete animations.scaleSymbolY;
            if (updateAnimation(animations.offsetSymbolX, 'offsetSymbolX')) delete animations.offsetSymbolX;
            if (updateAnimation(animations.offsetSymbolY, 'offsetSymbolY')) delete animations.offsetSymbolY;
            if (updateAnimation(animations.bgPercent, 'bgPercent')) delete animations.bgPercent;

            // Clean up if no animations remain
            if (Object.keys(animations).length === 0) {
                this.valueAnimations.delete(tileId);
            }
        }
    }

    public setViewport(x: number, y: number) {
        if (this.viewport.x !== x || this.viewport.y !== y) {
            this.log.debug(`Setting viewport to (${x},${y})`);
            
            // Update viewport position
            this.viewport.x = Math.max(0, Math.min(x, this.worldWidth - this.viewport.width));
            this.viewport.y = Math.max(0, Math.min(y, this.worldHeight - this.viewport.height));
        }
    }

    public clearAnimations(tileId: TileId): void {
        // Clear symbol animations
        this.animations.delete(tileId);
        
        // Clear color animations
        this.colorAnimations.delete(tileId);
        
        // Clear value animations
        this.valueAnimations.delete(tileId);
        
        this.log.verbose(`Cleared all animations for tile ${tileId}`);
    }

    public moveTiles(tileIds: TileId[], dx: number, dy: number): void {
        tileIds.forEach(id => {
            const tile = this.tileMap.get(id);
            if (tile) {
                this.moveTile(id, tile.x + dx, tile.y + dy);
            } else {
                this.log.warn(`Attempted to move non-existent tile: ${id}`);
            }
        });
    }

    public removeTiles(tileIds: TileId[]): void {
        tileIds.forEach(id => {
            if (this.tileMap.has(id)) {
                this.removeTile(id);
            } else {
                this.log.warn(`Attempted to remove non-existent tile: ${id}`);
            }
        });
    }
} 