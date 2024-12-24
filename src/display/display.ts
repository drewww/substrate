import { TextParser } from './util/text-parser';
import { Color, Tile, TileId, Viewport, SymbolAnimation, ColorAnimation, ValueAnimation, TileColorAnimationOptions, TileConfig, ValueAnimationOption, ColorAnimationOptions, TileValueAnimationsOptions, BlendMode, TileUpdateConfig } from './types';
import { interpolateColor } from './util/color';
import { logger } from '../util/logger';
import { DirtyMask } from './dirty-mask';
import { Point } from '../types';

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
    lastDirtyTileCount: number;
    averageDirtyTileCount: number;
}

export interface DisplayOptions {
    elementId?: string;
    cellWidth: number;
    cellHeight: number;
    worldWidth: number;
    worldHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    defaultFont?: string;
    customFont?: string;
}

export interface StringOptions {
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

export class Display {
    private displayCanvas: HTMLCanvasElement;    // The canvas shown to the user
    private renderCanvas: HTMLCanvasElement;
    private displayCtx: CanvasRenderingContext2D;
    private renderCtx: CanvasRenderingContext2D;
    private viewport: Viewport;
    private metrics: PerformanceMetrics;

    private worldWidth: number;
    private worldHeight: number;
    private readonly scale: number;
    private tileMap: Map<TileId, Tile> = new Map();
    private tileIdCounter: number = 0;

    private boundRenderFrame: (timestamp: number) => void;
    private isRunning: boolean = false;
    private symbolAnimations: Map<TileId, SymbolAnimation> = new Map();
    private colorAnimations: Map<TileId, {fg?: ColorAnimation, bg?: ColorAnimation}> = new Map();
    private valueAnimations: Map<TileId, {
        bgPercent?: ValueAnimation,
        x?: ValueAnimation,
        y?: ValueAnimation,
        offsetSymbolX?: ValueAnimation,
        offsetSymbolY?: ValueAnimation,
        scaleSymbolX?: ValueAnimation,
        scaleSymbolY?: ValueAnimation,
        rotation?: ValueAnimation
    }> = new Map();

    private hasChanges: boolean = true;
    private cellWidthCSS: number;
    private cellHeightCSS: number;
    private cellWidthScaled: number;
    private cellHeightScaled: number;
    
    private textParser: TextParser;

    private dirtyMask: DirtyMask;
    private useDirtyMask: boolean = true;

    private frameCallbacks: Set<(display: Display) => void> = new Set();

    private viewportAnimation?: {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        startTime: number;
        duration: number;
        easing: (t: number) => number;
    };

    // Track render canvas position in world
    private renderBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };

    constructor(options: DisplayOptions) {
        logger.info('Initializing Display with options:', options);
        
        this.scale = window.devicePixelRatio || 1;
        
        this.worldWidth = options.worldWidth;
        this.worldHeight = options.worldHeight;
        this.cellWidthCSS = options.cellWidth;
        this.cellHeightCSS = options.cellHeight;
        
        if (!options.elementId) {
            logger.error('elementId is required');
            throw new Error('elementId is required in DisplayConfig');
        }
        
        this.displayCanvas = document.getElementById(options.elementId) as HTMLCanvasElement;
        if (!this.displayCanvas) {
            logger.error(`Canvas element not found: ${options.elementId}`);
            throw new Error(`Canvas element not found: ${options.elementId}`);
        }

        this.displayCtx = this.displayCanvas.getContext('2d')!;
        const padding = Math.ceil(options.viewportWidth * 0.2); // 20% padding
        this.renderCanvas = document.createElement('canvas');
        this.renderCanvas.width = (options.viewportWidth + padding * 2) * this.scale;
        this.renderCanvas.height = (options.viewportHeight + padding * 2) * this.scale;

        this.renderCtx = this.renderCanvas.getContext('2d', { alpha: true })!;
        this.renderCtx.textBaseline = 'top';
        this.renderCtx.textAlign = 'left';
        this.renderCtx.imageSmoothingEnabled = false;

        this.renderBounds = {
            x: 0,
            y: 0,
            width: options.viewportWidth + padding * 2,
            height: options.viewportHeight + padding * 2
        };

        const displayWidth = options.viewportWidth * this.cellWidthCSS;
        const displayHeight = options.viewportHeight * this.cellHeightCSS;

        [this.displayCanvas, this.renderCanvas].forEach(canvas => {
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            canvas.width = displayWidth * this.scale;
            canvas.height = displayHeight * this.scale;
        });

        this.cellWidthScaled = options.cellWidth * this.scale;
        this.cellHeightScaled = options.cellHeight * this.scale;
        
        this.displayCanvas.width = options.viewportWidth * this.cellWidthScaled;
        this.displayCanvas.height = options.viewportHeight * this.cellHeightScaled;
        
        this.displayCanvas.style.width = `${options.viewportWidth * this.cellWidthCSS}px`;
        this.displayCanvas.style.height = `${options.viewportHeight * this.cellHeightCSS}px`;

        [this.displayCtx, this.renderCtx].forEach(ctx => {
            ctx.imageSmoothingEnabled = false;
            ctx.textRendering = 'geometricPrecision';
        });

        this.viewport = {
            x: 0,
            y: 0,
            width: options.viewportWidth,
            height: options.viewportHeight
        };

        this.setupFont(options.defaultFont, options.customFont);

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
            averageWorldUpdateTime: 0,
            lastDirtyTileCount: 0,
            averageDirtyTileCount: 0
        };

        this.textParser = new TextParser({
            'r': '#FF0000FF',  // red
            'g': '#00FF00FF',  // green
            'b': '#0088FFFF',  // blue
            'y': '#FFFF00FF',  // yellow
            'm': '#FF00FFFF',  // magenta
            'w': '#FFFFFFFF',  // white
        });

        // Initialize renderCanvas with padding around viewport
       
        
        

        // Initialize dirtyMask for entire world
        this.dirtyMask = new DirtyMask(options.worldWidth, options.worldHeight);
        
        // Mark initial viewport area as dirty
        this.markEntireViewport(this.viewport.x, this.viewport.y);

        logger.info('Display initialization complete');

        this.boundRenderFrame = this.renderFrame.bind(this);
        this.startRenderLoop();
    }

    private setupFont(defaultFont?: string, customFont?: string) {
        const fontFamily = customFont || defaultFont || 'monospace';
        const fontSize = Math.floor(this.cellHeightScaled * 0.8);
        
        [this.displayCtx, this.renderCtx].forEach(ctx => {
            ctx.font = `normal normal ${fontSize}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fontKerning = 'none';
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
        logger.verbose(`Creating tile ${id} at (${x},${y})`);
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
            rotation: 0,
            noClip: config?.noClip ?? false,
            blendMode: config?.blendMode ?? BlendMode.SourceOver,
         };
        
        this.tileMap.set(id, tile);
        this.dirtyMask.markDirty(tile);
        return id;
    }

    public moveTile(tileId: TileId, newX: number, newY: number): void {
        const tile = this.tileMap.get(tileId);
        if (tile && (tile.x !== newX || tile.y !== newY)) {
            this.hasChanges = true;
            if (!tile) {
                logger.warn(`Attempted to move non-existent tile: ${tileId}`);
                return;
            }

            if (newX < 0 || newX >= this.worldWidth || newY < 0 || newY >= this.worldHeight) {
                logger.warn(`Attempted to move tile outside bounds: (${newX},${newY})`);
                return;
            }

            logger.verbose(`Moving tile ${tileId} to (${newX},${newY})`);
            this.dirtyMask.markDirty(tile);
            tile.x = newX;
            tile.y = newY;
            this.dirtyMask.markDirty(tile);
        }
    }

    public removeTile(tileId: TileId): void {
        logger.debug(`Display removing tile ${tileId}`);
        const tile = this.tileMap.get(tileId);
        if (tile) {
            // Mark the tile's position as dirty before removing it
            this.dirtyMask.markDirty(tile);
            
            // Clear any animations
            this.clearAnimations(tileId);
            
            // Remove the tile
            this.tileMap.delete(tileId);
            logger.debug(`Tile ${tileId} removed from display`);
            
            this.hasChanges = true;
        } else {
            logger.warn(`Attempted to remove non-existent tile: ${tileId}`);
        }
    }

    public updateTileColor(tileId: TileId, newColor: Color): void {
        const tile = this.tileMap.get(tileId);
        if (tile && tile.color !== newColor) {
            this.hasChanges = true;
            tile.color = newColor;

            this.dirtyMask.markDirty(tile);
        }
    }

    private renderTile(tile: Tile, renderX?: number, renderY?: number): void {
        const x = renderX ?? (tile.x * this.cellWidthScaled);
        const y = renderY ?? (tile.y * this.cellHeightScaled);
        
        this.renderCtx.save();
        
        this.renderCtx.translate(x, y);

        // Set blend mode if not default
        if (tile.blendMode !== BlendMode.SourceOver) {
            this.renderCtx.globalCompositeOperation = tile.blendMode;
        }
        
        if (!tile.noClip) {
            this.renderCtx.beginPath();
            this.renderCtx.rect(0, 0, this.cellWidthScaled, this.cellHeightScaled);
            this.renderCtx.clip();
        }
        
        const cellWidth = this.cellWidthScaled;
        const cellHeight = this.cellHeightScaled;

        // Rotate from center if needed
        if (tile.rotation) {
            this.renderCtx.save();
            this.renderCtx.translate(cellWidth/2, cellHeight/2);
            this.renderCtx.rotate(tile.rotation);
            this.renderCtx.translate(-cellWidth/2, -cellHeight/2);
            this.renderCtx.restore();
        }

        // logger.debug(`Rendering tile ${tile.id} with background color ${tile.backgroundColor}`);
        
        if (tile.backgroundColor && tile.backgroundColor !== '#00000000') {
            const bgPercent = tile.bgPercent ?? 1;
            if (bgPercent > 0) {
                this.renderCtx.fillStyle = tile.backgroundColor;

                switch (tile.fillDirection) {
                    case FillDirection.TOP:
                        this.renderCtx.fillRect(
                            0,
                            0,
                            cellWidth,
                            cellHeight * bgPercent
                        );
                        break;
                    case FillDirection.RIGHT:
                        this.renderCtx.fillRect(
                            0 + cellWidth * (1 - bgPercent),
                            0,
                            cellWidth * bgPercent,
                            cellHeight
                        );
                        break;
                    case FillDirection.BOTTOM:
                        this.renderCtx.fillRect(
                            0,
                            0 + cellHeight * (1 - bgPercent),
                            cellWidth,
                            cellHeight * bgPercent
                        );
                        break;
                    case FillDirection.LEFT:
                        this.renderCtx.fillRect(
                            0,
                            0,
                            cellWidth * bgPercent,
                            cellHeight
                        );
                        break;
                }                
            }
        }
        
        if (tile.char && tile.color) {
            const offsetX = (tile.offsetSymbolX || 0) * this.cellWidthScaled;
            const offsetY = (tile.offsetSymbolY || 0) * this.cellHeightScaled;
            
            this.renderCtx.save();
            
            // Move to center of cell
            this.renderCtx.translate(this.cellWidthScaled/2, this.cellHeightScaled * 0.55);
            
            // Apply rotation if any
            if (tile.rotation) {
                this.renderCtx.rotate(tile.rotation);
            }
            
            // Apply scale
            this.renderCtx.scale(tile.scaleSymbolX, tile.scaleSymbolY);
            
            // Apply offset
            this.renderCtx.translate(offsetX, offsetY);
            
            this.renderCtx.fillStyle = tile.color;
            this.renderCtx.fillText(tile.char, 0, 0);
            
            this.renderCtx.restore();
        }

        this.renderCtx.restore();
    }

    private renderFrame(timestamp: number): void {
        try {
            const animationStart = performance.now();
            
            if (this.viewportAnimation) {
                this.updateViewportAnimation(timestamp);
            }

            const hasActiveAnimations = 
                this.symbolAnimations.size > 0 || 
                this.colorAnimations.size > 0 || 
                this.valueAnimations.size > 0 ||
                this.viewportAnimation !== undefined;

            if (hasActiveAnimations || this.hasChanges) {
                // Update render canvas if we have changes

                this.updateSymbolAnimations(timestamp);
                this.updateColorAnimations(timestamp);
                this.updateValueAnimations(timestamp);
                
                this.updateRenderCanvas();
                this.hasChanges = false;
            }

            // Copy from renderCanvas to displayCanvas
            const sourceX = (this.viewport.x - this.renderBounds.x) * this.cellWidthScaled;
            const sourceY = (this.viewport.y - this.renderBounds.y) * this.cellHeightScaled;
            
            this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
            this.displayCtx.drawImage(
                this.renderCanvas,
                sourceX, sourceY,
                this.viewport.width * this.cellWidthScaled,
                this.viewport.height * this.cellHeightScaled,
                0, 0,
                this.displayCanvas.width,
                this.displayCanvas.height
            );

            const animationEnd = performance.now();
            const renderStart = animationEnd;

            // Call frame callbacks
            this.frameCallbacks.forEach(callback => callback(this));

            const renderEnd = performance.now();

            // this.updateMetrics(renderStart, animationStart, animationEnd, renderEnd);
            this.updateMetrics(renderStart);

        } catch (error) {
            console.error('Render error:', error);
        }

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

    private updateMetrics(timestamp: number): void {
        const now = performance.now();
        
        // Update FPS
        this.metrics.frameCount++;
        const timeSinceLastUpdate = now - this.metrics.lastFpsUpdate;
        if (timeSinceLastUpdate >= 1000) {
            this.metrics.fps = (this.metrics.frameCount / timeSinceLastUpdate) * 1000;
            this.metrics.frameCount = 0;
            this.metrics.lastFpsUpdate = now;
        }

        // Update animation counts
        this.metrics.symbolAnimationCount = this.symbolAnimations.size;
        this.metrics.colorAnimationCount = Array.from(this.colorAnimations.values())
            .reduce((count, anims) => count + (anims.fg ? 1 : 0) + (anims.bg ? 1 : 0), 0);
        this.metrics.valueAnimationCount = Array.from(this.valueAnimations.values())
            .reduce((count, anims) => count + Object.values(anims).filter(a => a?.running).length, 0);

        // Update render times
        const renderTime = performance.now() - now;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 0.95) + (renderTime * 0.05);
    }

    public getPerformanceMetrics(): Readonly<PerformanceMetrics> {
        return { ...this.metrics };
    }

    public getDebugString(): string {
        return `FPS: ${this.metrics.fps.toFixed(1)}
Render Time: ${this.metrics.lastRenderTime.toFixed(2)}ms (avg: ${this.metrics.averageRenderTime.toFixed(2)}ms)
Active Animations: ${this.metrics.symbolAnimationCount + this.metrics.colorAnimationCount + this.metrics.valueAnimationCount}
├─ Symbol: ${this.metrics.symbolAnimationCount}
├─ Color: ${this.metrics.colorAnimationCount}
└─ Value: ${this.metrics.valueAnimationCount}`;
    }

    public clear() {
        this.hasChanges = true;
        logger.info('Clearing display');
        
        this.tileMap.clear();
        this.symbolAnimations.clear();
        this.colorAnimations.clear();
        this.valueAnimations.clear();

        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
        this.renderCtx.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);
    }

    public setBackground(symbol: string, fgColor: Color, bgColor: Color): void {
        const existingBackgroundTiles = Array.from(this.tileMap.values())
            .filter(tile => tile.zIndex === -1)
            .map(tile => tile.id);
        existingBackgroundTiles.forEach(id => this.removeTile(id));

        for (let y = 0; y < this.worldHeight; y++) {
            for (let x = 0; x < this.worldWidth; x++) {
                this.createTile(
                    x,
                    y,
                    symbol,
                    fgColor,
                    bgColor,
                    -1
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
        const timestamp = Date.now();
        const id = `t_${timestamp}_${this.tileIdCounter++}`;
        return id;
    }

    public getTile(tileId: TileId): Tile | undefined {
        return this.tileMap.get(tileId);
    }

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
            logger.warn(`Attempted to empty cell outside world bounds: (${x},${y})`);
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
        offset: number = 0,
        loop: boolean = true,
        reverse: boolean = false, 
        startTime?: number
    ): void {
        if (!this.tileMap.has(tileId)) {
            logger.warn(`Attempted to add animation to non-existent tile: ${tileId}`);
            return;
        }
        
        this.symbolAnimations.set(tileId, {
            symbols,
            startTime: startTime ?? performance.now(),
            duration,
            reverse,
            loop,
            offset,
            running: true
        });
    }

    private updateSymbolAnimations(timestamp: number): void {
        for (const [tileId, animation] of this.symbolAnimations) {
            const tile = this.tileMap.get(tileId);
            if (!tile || !animation.running) {
                if (!tile) {
                    this.symbolAnimations.delete(tileId);
                }
                continue;
            }

            const elapsed = (timestamp - animation.startTime) / 1000;
            let progress = (elapsed / animation.duration) + (animation.offset || 0);
            
            if (animation.loop) {
                if (animation.reverse) {
                    progress = progress % 2;
                    if (progress > 1) {
                        progress = 2 - progress;
                    }
                } else {
                    progress = progress % 1;
                }
            } else {
                progress = Math.min(progress, 1);
            }
            
            const index = Math.floor(progress * animation.symbols.length);
            tile.char = animation.symbols[index];

            // Remove animation if complete and not looping
            if (!animation.loop && progress >= 1) {
                this.symbolAnimations.delete(tileId);
            }

            this.dirtyMask.markDirty(tile);
        }
    }

    

    private updateColorAnimations(timestamp: number): void {
        for (const [tileId, animations] of this.colorAnimations) {
            const tile = this.tileMap.get(tileId);
            if (!tile) {
                this.colorAnimations.delete(tileId);
                continue;
            }
                        
            const updateAnimation = (animation: ColorAnimation | undefined, property: 'color' | 'backgroundColor') => {
                if (!animation || !animation.running) return animation;  // Add running check here

                const elapsed = (timestamp - animation.startTime) / 1000;
                let progress = (elapsed / animation.duration) + animation.offset;
                
                if (animation.loop) {
                    if (animation.reverse) {
                        progress = progress % 2;
                        if (progress > 1) {
                            progress = 2 - progress;
                        }
                    } else {
                        progress = progress % 1;
                    }
                } else {
                    progress = Math.min(progress, 1);
                }
                
                const easedProgress = animation.easing ? animation.easing(progress) : progress;
                const interpolatedColor = interpolateColor(animation.startColor, animation.endColor, easedProgress);
                tile[property] = interpolatedColor;

                // Check if animation is complete
                if (!animation.loop && progress >= 1) {
                    if (animation.next) {
                        animation.next.startTime = timestamp;
                        return animation.next;
                    }
                    return undefined;
                }
                
                return animation;
            };

            animations.fg = updateAnimation(animations.fg, 'color');
            animations.bg = updateAnimation(animations.bg, 'backgroundColor');

            // Clean up if no animations remain
            if (!animations.fg && !animations.bg) {
                this.colorAnimations.delete(tileId);
            }

            this.dirtyMask.markDirty(tile);
        }
    }

    public addColorAnimation(tileId: TileId, options: TileColorAnimationOptions): void {
        const animations: {fg?: ColorAnimation, bg?: ColorAnimation} = {};
        const effectiveStartTime = options.startTime ?? performance.now();

        const createColorAnimationChain = (transition: ColorAnimationOptions, startTime: number): ColorAnimation => {
            const animation: ColorAnimation = {
                startColor: transition.start,
                endColor: transition.end,
                duration: transition.duration,
                startTime: startTime,
                reverse: transition.reverse || false,
                loop: transition.loop || false,
                offset: transition.offset || 0,
                easing: transition.easing,
                next: transition.next ? createColorAnimationChain(transition.next, performance.now()) : undefined,
                running: true
            };
            return animation;
        };

        if (options.fg) {
            animations.fg = createColorAnimationChain(options.fg, effectiveStartTime);
        }

        if (options.bg) {
            animations.bg = createColorAnimationChain(options.bg, effectiveStartTime);
        }

        this.colorAnimations.set(tileId, animations);
    }

    public addValueAnimation(tileId: TileId, options: TileValueAnimationsOptions): void {
        const effectiveStartTime = options.startTime ?? performance.now();
        
        // Properly type the animations object
        const animations: {
            rotation?: ValueAnimation;
            bgPercent?: ValueAnimation;
            offsetSymbolX?: ValueAnimation;
            offsetSymbolY?: ValueAnimation;
            scaleSymbolX?: ValueAnimation;
            scaleSymbolY?: ValueAnimation;
            x?: ValueAnimation;
            y?: ValueAnimation;
        } = {};
        
        const createValueAnimation = (config: ValueAnimationOption): ValueAnimation => {
            return {
                startValue: config.start,
                endValue: config.end,
                duration: config.duration,
                startTime: effectiveStartTime,
                reverse: config.reverse || false,
                offset: config.offset || 0,
                easing: config.easing || Easing.linear,
                loop: config.loop ?? true,
                next: config.next ? createValueAnimation(config.next) : undefined,
                running: true  // Set initial state to running
            };
        };

        // Add animations with proper typing
        if (options.rotation) {
            animations.rotation = createValueAnimation(options.rotation);
        }
        if (options.bgPercent) {
            animations.bgPercent = createValueAnimation(options.bgPercent);
        }
        if (options.offsetSymbolX) {
            animations.offsetSymbolX = createValueAnimation(options.offsetSymbolX);
        }
        if (options.offsetSymbolY) {
            animations.offsetSymbolY = createValueAnimation(options.offsetSymbolY);
        }
        if (options.scaleSymbolX) {
            animations.scaleSymbolX = createValueAnimation(options.scaleSymbolX);
        }
        if (options.scaleSymbolY) {
            animations.scaleSymbolY = createValueAnimation(options.scaleSymbolY);
        }
        if (options.x) {
            animations.x = createValueAnimation(options.x);
        }
        if (options.y) {
            animations.y = createValueAnimation(options.y);
        }

        this.valueAnimations.set(tileId, animations);
    }

    private updateValueAnimations(timestamp: number): void {
        for (const [tileId, animations] of this.valueAnimations) {
            const tile = this.tileMap.get(tileId);
            if (!tile) {
                this.valueAnimations.delete(tileId);
                continue;
            }

            const updateAnimation = (
                animation: ValueAnimation | undefined, 
                property: 'x' | 'y' | 'scaleSymbolX' | 'scaleSymbolY' | 'offsetSymbolX' | 'offsetSymbolY' | 'bgPercent' | 'rotation'
            ) => {
                if (!animation || !animation.running) return animation;  // Skip if not running

                const elapsed = (timestamp - animation.startTime) / 1000;
                let progress = (elapsed / animation.duration) + animation.offset;

                if (animation.loop) {
                    if (animation.reverse) {
                        progress = progress % 2;
                        if (progress > 1) {
                            progress = 2 - progress;
                        }
                    } else {
                        progress = progress % 1;
                    }
                } else {
                    progress = Math.min(progress, 1);
                }

                const easedProgress = animation.easing(progress);
                tile[property] = animation.startValue + 
                    (animation.endValue - animation.startValue) * easedProgress;
                
                // Check if animation is complete
                if (!animation.loop && progress >= 1) {
                    if (animation.next) {
                        animation.next.startTime = timestamp;
                        return animation.next;
                    }
                    return undefined;
                }
                
                return animation;
            };

            // Update each animation type including rotation
            animations.rotation = updateAnimation(animations.rotation, 'rotation');
            animations.x = updateAnimation(animations.x, 'x');
            animations.y = updateAnimation(animations.y, 'y');
            animations.scaleSymbolX = updateAnimation(animations.scaleSymbolX, 'scaleSymbolX');
            animations.scaleSymbolY = updateAnimation(animations.scaleSymbolY, 'scaleSymbolY');
            animations.offsetSymbolX = updateAnimation(animations.offsetSymbolX, 'offsetSymbolX');
            animations.offsetSymbolY = updateAnimation(animations.offsetSymbolY, 'offsetSymbolY');
            animations.bgPercent = updateAnimation(animations.bgPercent, 'bgPercent');

            this.dirtyMask.markDirty(tile);
        }
    }

    public setViewport(x: number, y: number, options?: { 
        smooth?: boolean;
        duration?: number;
        easing?: (t: number) => number;
    }) {
        const targetX = Math.max(0, Math.min(x, this.worldWidth - this.viewport.width));
        const targetY = Math.max(0, Math.min(y, this.worldHeight - this.viewport.height));

        if (options?.smooth) {
            // Start a new viewport animation
            this.viewportAnimation = {
                startX: this.viewport.x,
                startY: this.viewport.y,
                endX: targetX,
                endY: targetY,
                startTime: performance.now(),
                duration: options.duration || 0.1, // Default to 100ms
                easing: options.easing || Easing.quadOut // Default to quadratic easing
            };
            this.hasChanges = true;
        } else {
            // Immediate update
            if (this.viewport.x !== targetX || this.viewport.y !== targetY) {
                logger.debug(`Setting viewport to (${targetX},${targetY})`);
                this.viewport.x = targetX;
                this.viewport.y = targetY;
                this.hasChanges = true;
            }
        }
    }

    private updateViewportAnimation(timestamp: number): void {
        if (!this.viewportAnimation) return;

        const elapsed = (timestamp - this.viewportAnimation.startTime) / 1000;
        const progress = Math.min(elapsed / this.viewportAnimation.duration, 1);
        
        if (progress >= 1) {
            // Animation complete
            this.viewport.x = this.viewportAnimation.endX;
            this.viewport.y = this.viewportAnimation.endY;
            this.viewportAnimation = undefined;
        } else {
            // Update viewport position
            const easedProgress = this.viewportAnimation.easing(progress);
            this.viewport.x = this.viewportAnimation.startX + 
                (this.viewportAnimation.endX - this.viewportAnimation.startX) * easedProgress;
            this.viewport.y = this.viewportAnimation.startY + 
                (this.viewportAnimation.endY - this.viewportAnimation.startY) * easedProgress;
        }
        
        this.hasChanges = true;
    }

    public clearAnimations(tileId: TileId): void {
        this.symbolAnimations.delete(tileId);
        this.colorAnimations.delete(tileId);
        this.valueAnimations.delete(tileId);
        
        logger.verbose(`Cleared all animations for tile ${tileId}`);
    }

    public moveTiles(tileIds: TileId[], dx: number, dy: number): void {
        tileIds.forEach(id => {
            const tile = this.tileMap.get(id);
            if (tile) {
                this.moveTile(id, tile.x + dx, tile.y + dy);
            } else {
                logger.warn(`Attempted to move non-existent tile: ${id}`);
            }
        });
    }

    public removeTiles(tileIds: TileId[]): void {
        tileIds.forEach(id => {
            if (this.tileMap.has(id)) {
                this.removeTile(id);
            } else {
                logger.warn(`Attempted to remove non-existent tile: ${id}`);
            }
        });
    }

    public stopTileAnimations(tileId: TileId): void {
        // Helper to stop all animations in a chain
        const stopChain = <T extends { next?: T, running: boolean }>(anim: T): void => {
            let current: T | undefined = anim;
            while (current) {
                current.running = false;
                current = current.next;
            }
        };

        // Stop symbol animations
        const symbolAnim = this.symbolAnimations.get(tileId);
        if (symbolAnim) {
            symbolAnim.running = false;
        }

        // Stop color animations
        const colorAnims = this.colorAnimations.get(tileId);
        if (colorAnims) {
            if (colorAnims.fg) stopChain(colorAnims.fg);
            if (colorAnims.bg) stopChain(colorAnims.bg);
        }

        // Stop value animations
        const valueAnims = this.valueAnimations.get(tileId);
        if (valueAnims) {
            Object.values(valueAnims).forEach(anim => {
                if (anim) stopChain(anim);
            });
        }
    }

    public toggleDirtyMask(): boolean {
        this.useDirtyMask = !this.useDirtyMask;
        // Force full redraw when toggling
        if (this.useDirtyMask) {
            this.dirtyMask.clear();
        }
        this.hasChanges = true;
        return this.useDirtyMask;
    }

    public addFrameCallback(callback: (display: Display) => void): void {
        this.frameCallbacks.add(callback);
    }

    public removeFrameCallback(callback: (display: Display) => void): void {
        this.frameCallbacks.delete(callback);
    }

    public getDirtyMask(): readonly boolean[][] {
        return this.dirtyMask.getMask();
    }

    public viewportToWorld(screenX: number, screenY: number): Point | null {
        // Convert screen coordinates to world coordinates
        const rect = this.displayCanvas.getBoundingClientRect();
        const x = Math.floor((screenX - rect.left) / this.cellWidthCSS) + this.viewport.x;
        const y = Math.floor((screenY - rect.top) / this.cellHeightCSS) + this.viewport.y;
        
        // Check if the point is within world bounds
        if (x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight) {
            return { x, y };
        }
        return null;
    }

    // Optional: Add method to register click handlers
    public onCellClick(callback: (worldPos: Point) => void): void {
        this.displayCanvas.addEventListener('click', (event) => {
            const worldPos = this.viewportToWorld(event.clientX, event.clientY);
            if (worldPos) {
                callback(worldPos);
            }
        });
    }

    public onCellHover(callback: (worldPos: Point | null) => void): void {
        this.displayCanvas.addEventListener('mousemove', (event) => {
            const worldPos = this.viewportToWorld(event.clientX, event.clientY);
            callback(worldPos);
        });
        this.displayCanvas.addEventListener('mouseleave', () => {
            callback(null);
        });
    }

    public updateTile(tileId: TileId, config: TileUpdateConfig): void {
        const tile = this.tileMap.get(tileId);
        if (!tile) {
            logger.warn(`Attempted to update non-existent tile: ${tileId}`);
            return;
        }

        // Update tile properties
        if (config.char !== undefined) tile.char = config.char;
        if (config.fg !== undefined) tile.color = config.fg;
        if (config.bg !== undefined) tile.backgroundColor = config.bg;
        if (config.zIndex !== undefined) tile.zIndex = config.zIndex;
        if (config.bgPercent !== undefined) tile.bgPercent = config.bgPercent;
        if (config.fillDirection !== undefined) tile.fillDirection = config.fillDirection;
        if (config.noClip !== undefined) tile.noClip = config.noClip;
        if (config.blendMode !== undefined) tile.blendMode = config.blendMode;

        this.dirtyMask.markDirty(tile);
        this.hasChanges = true;
    }

    private updateRenderCanvas(): void {
        // Temporarily ignore dirty mask checks
        // if (!this.dirtyMask.hasDirtyTiles()) return;

        const padding = Math.ceil(this.viewport.width * 0.1);
        const needsReposition = 
            this.viewport.x < this.renderBounds.x + padding ||
            this.viewport.x + this.viewport.width > this.renderBounds.x + this.renderBounds.width - padding ||
            this.viewport.y < this.renderBounds.y + padding ||
            this.viewport.y + this.viewport.height > this.renderBounds.y + this.renderBounds.height - padding;

        if (needsReposition) {
            // Store old bounds for cleanup
            const oldBounds = { ...this.renderBounds };
            
            // Center renderCanvas on viewport
            this.renderBounds.x = this.viewport.x - Math.floor(this.renderBounds.width * 0.3);
            this.renderBounds.y = this.viewport.y - Math.floor(this.renderBounds.height * 0.3);
            
            // Constrain to world bounds
            this.renderBounds.x = Math.max(0, Math.min(this.renderBounds.x, 
                this.worldWidth - this.renderBounds.width));
            this.renderBounds.y = Math.max(0, Math.min(this.renderBounds.y, 
                this.worldHeight - this.renderBounds.height));

            // Clear entire render canvas when repositioning
            this.renderCtx.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);
        }

        // Process all tiles within render bounds, not just dirty ones
        const visibleTiles = Array.from(this.tileMap.values())
            .filter(tile => 
                tile.x >= this.renderBounds.x && 
                tile.x < this.renderBounds.x + this.renderBounds.width &&
                tile.y >= this.renderBounds.y && 
                tile.y < this.renderBounds.y + this.renderBounds.height
            )
            .sort((a, b) => a.zIndex - b.zIndex);

        // Group tiles by position for efficient rendering
        const tilesByCell = new Map<string, Tile[]>();
        visibleTiles.forEach(tile => {
            const key = `${tile.x},${tile.y}`;
            if (!tilesByCell.has(key)) {
                tilesByCell.set(key, []);
            }
            tilesByCell.get(key)!.push(tile);
        });

        // Render all visible cells
        for (const [key, tiles] of tilesByCell) {
            const [x, y] = key.split(',').map(Number);
            const renderX = (x - this.renderBounds.x) * this.cellWidthScaled;
            const renderY = (y - this.renderBounds.y) * this.cellHeightScaled;
            
            this.renderCtx.clearRect(
                renderX, renderY,
                this.cellWidthScaled,
                this.cellHeightScaled
            );
            
            tiles.forEach(tile => this.renderTile(tile, renderX, renderY));
            // Temporarily disable marking clean
            // this.dirtyMask.markClean(x, y);
        }
    }

    private markEntireViewport(x: number, y: number): void {
        const vpLeft = Math.max(0, x);
        const vpRight = Math.min(this.worldWidth, x + this.viewport.width);
        const vpTop = Math.max(0, y);
        const vpBottom = Math.min(this.worldHeight, y + this.viewport.height);

        for (let cy = vpTop; cy < vpBottom; cy++) {
            for (let cx = vpLeft; cx < vpRight; cx++) {
                this.dirtyMask.markDirtyXY(cx, cy);
            }
        }
    }
} 

export { BlendMode };
