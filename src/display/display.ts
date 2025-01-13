import { TextParser } from './util/text-parser';
import { Color, Tile, TileId, Viewport, SymbolAnimation, ColorAnimation, ValueAnimation, TileColorAnimationOptions, TileConfig, ValueAnimationOption, ColorAnimationOptions, TileValueAnimationsOptions, BlendMode, TileUpdateConfig } from './types';
import { logger } from '../util/logger';
import { Point } from '../types';
import { DirtyMask } from './dirty-mask';
import { SymbolAnimationConfig, SymbolAnimationModule } from '../animation/symbol-animation';
import { ColorAnimationConfig, ColorAnimationModule } from '../animation/color-animation';
import { ValueAnimationConfig, ValueAnimationModule } from '../animation/value-animation';

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

// A collection of easing functions that translate an input value between 0 and 1 into an output value between 0 and 1
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
        t < 0.5 ? (1 - Easing.bounceOut(1 - 2 * t)) / 2 : (1 + Easing.bounceOut(2 * t - 1)) / 2,

    round: (t: number): number => Math.round(t),
    maxDelay: (t: number): number => t >= 0.99 ? 1 : 0,
    flicker: (t: number): number => {
        if (t >= 0.99) {
            return 1;
        } if (t <= 0.97 && t >= 0.96) {
            return 1;
        } if (t <= 0.95 && t >= 0.94) {
            return 1;
        } else {
            return 0;
        }
    },
};

// Similar but different to Easing functions. These take a value between 0 and 1, but can return  a value from
// [-Infinity, Infinity]. In practice, they are used to transform the output of an easing function into
// a domain in a non-linear manner.
// 
// This is necessary because the basic linear transform, which the vast majority of animations use, cannot
// create cyclic behavior because it assumes starting at the min value in a range and ending at the max value.
// Obviously that does not work for all animations.

export const Transform = {
    linear: (t: number): number => t,
    cosine: (t: number): number => Math.cos(t * Math.PI * 2),
    sine: (t: number): number => Math.sin(t * Math.PI * 2),
}

// Constants for viewport padding (percentage of viewport size)
const VIEWPORT_PADDING_X = 0.2; // 20% padding on each side
const VIEWPORT_PADDING_Y = 0.2; // 20% padding on top/bottom

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
    private symbolAnimations: SymbolAnimationModule;
    private colorAnimations: ColorAnimationModule;
    private valueAnimations: ValueAnimationModule;

    private hasChanges: boolean = true;
    private cellWidthCSS: number;
    private cellHeightCSS: number;
    private cellWidthScaled: number;
    private cellHeightScaled: number;
    
    private textParser: TextParser;

    private dirtyMask: DirtyMask;
    private useDirtyMask: boolean = false;

    private frameCallbacks: Set<(display: Display, timestamp: number) => void> = new Set();

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

    private visibilityMask: number[][] = [];

    private maskCanvas: HTMLCanvasElement;
    private maskCtx: CanvasRenderingContext2D;
    private maskDirty: boolean = true;

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
        
        // Calculate padding in tiles
        const paddingX = Math.ceil(options.viewportWidth * VIEWPORT_PADDING_X);
        const paddingY = Math.ceil(options.viewportHeight * VIEWPORT_PADDING_Y);

        // Calculate dimensions in CSS pixels
        const displayWidth = options.viewportWidth * this.cellWidthCSS;
        const displayHeight = options.viewportHeight * this.cellHeightCSS;
        const renderWidth = (options.viewportWidth + paddingX * 2) * this.cellWidthCSS;
        const renderHeight = (options.viewportHeight + paddingY * 2) * this.cellHeightCSS;

        // Set up display canvas
        this.displayCanvas.style.width = `${displayWidth}px`;
        this.displayCanvas.style.height = `${displayHeight}px`;
        this.displayCanvas.width = displayWidth * this.scale;
        this.displayCanvas.height = displayHeight * this.scale;

        // Set up render canvas with padding
        this.renderCanvas = document.createElement('canvas');
        this.renderCanvas.style.width = `${renderWidth}px`;
        this.renderCanvas.style.height = `${renderHeight}px`;
        this.renderCanvas.width = renderWidth * this.scale;
        this.renderCanvas.height = renderHeight * this.scale;

        this.renderCtx = this.renderCanvas.getContext('2d', { alpha: true })!;
        this.renderCtx.textBaseline = 'top';
        this.renderCtx.textAlign = 'left';
        this.renderCtx.imageSmoothingEnabled = false;

        this.renderBounds = {
            x: 0,
            y: 0,
            width: options.viewportWidth + paddingX * 2,
            height: options.viewportHeight + paddingY * 2
        };

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

        // Initialize visibility mask
        this.visibilityMask = Array(this.worldHeight).fill(0)
            .map(() => Array(this.worldWidth).fill(1));

        // Initialize mask canvas
        this.maskCanvas = document.createElement('canvas');
        this.maskCtx = this.maskCanvas.getContext('2d', { alpha: true })!;

        logger.info('Display initialization complete');

        this.boundRenderFrame = this.renderFrame.bind(this);
        this.startRenderLoop();

        this.symbolAnimations = new SymbolAnimationModule(
            (id, values) => {
                if (values.symbol) {
                    this.updateTileProperty(id, 'char', values.symbol);
                }
            }
        );

        this.colorAnimations = new ColorAnimationModule(
            (id, values) => {
                if (values.fg) {
                    this.updateTileProperty(id, 'color', values.fg);
                }
                if (values.bg) {
                    this.updateTileProperty(id, 'backgroundColor', values.bg);
                }
            }
        );

        this.valueAnimations = new ValueAnimationModule(
            (id, values) => {
                if (values.x !== undefined) {
                    this.updateTileProperty(id, 'x', values.x);
                }
                if (values.y !== undefined) {
                    this.updateTileProperty(id, 'y', values.y);
                }
                if (values.bgPercent !== undefined) {
                    this.updateTileProperty(id, 'bgPercent', values.bgPercent);
                }
                if(values.rotation !== undefined) {
                    this.updateTileProperty(id, 'rotation', values.rotation);
                }
                if(values.scaleSymbolX !== undefined) {
                    this.updateTileProperty(id, 'scaleSymbolX', values.scaleSymbolX);
                }
                if(values.scaleSymbolY !== undefined) {
                    this.updateTileProperty(id, 'scaleSymbolY', values.scaleSymbolY);
                }
                if(values.offsetSymbolX !== undefined) {
                    this.updateTileProperty(id, 'offsetSymbolX', values.offsetSymbolX);
                }
                if(values.offsetSymbolY !== undefined) {
                    this.updateTileProperty(id, 'offsetSymbolY', values.offsetSymbolY);
                }
            }
        );
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
            alwaysRenderIfExplored: config?.alwaysRenderIfExplored ?? false,
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

    private renderTile(tile: Tile, renderX?: number, renderY?: number): void {
        // Early exit if we shouldn't render this tile based on visibility
        if (!this.shouldRenderTile(tile)) {
            return;
        }

        const x = Math.round(renderX ?? (tile.x * this.cellWidthScaled));  // Round to nearest pixel
        const y = Math.round(renderY ?? (tile.y * this.cellHeightScaled));  // Round to nearest pixel
        
        this.renderCtx.save();
        this.renderCtx.translate(x, y);

        if (!tile.noClip) {
            this.renderCtx.beginPath();
            // Use integer coordinates for the clip rectangle
            this.renderCtx.rect(
                0,
                0,
                Math.ceil(this.cellWidthScaled),
                Math.ceil(this.cellHeightScaled)
            );
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
            }

            const animationEnd = performance.now();
            const renderStart = animationEnd;


            if(hasActiveAnimations || this.hasChanges) {
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

            // Call frame callbacks
            this.frameCallbacks.forEach(callback => callback(this, timestamp));

            const renderEnd = performance.now();

            this.updateMetrics(renderStart, animationStart, animationEnd, renderEnd);
            
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

    private updateMetrics(renderStart: number, animationStart: number, animationEnd: number, renderEnd: number): void {
        const now = performance.now();
        
        // Update FPS
        this.metrics.frameCount++;
        const timeSinceLastUpdate = now - this.metrics.lastFpsUpdate;
        if (timeSinceLastUpdate >= 1000) {
            this.metrics.fps = (this.metrics.frameCount / timeSinceLastUpdate) * 1000;
            this.metrics.frameCount = 0;
            this.metrics.lastFpsUpdate = now;
        }

        // Update animation counts using new metrics
        const colorMetrics = this.colorAnimations.getMetrics();
        const valueMetrics = this.valueAnimations.getMetrics();
        
        this.metrics.symbolAnimationCount = this.symbolAnimations.size;
        this.metrics.colorAnimationCount = colorMetrics.activeCount;
        this.metrics.valueAnimationCount = valueMetrics.activeCount;

        // Update render times
        const renderTime = now - renderStart;
        this.metrics.lastRenderTime = renderTime;
        this.metrics.averageRenderTime = (this.metrics.averageRenderTime * 0.95) + (renderTime * 0.05);

        const animationTime = now - animationStart;
        this.metrics.lastAnimationUpdateTime = animationTime;
        this.metrics.averageAnimationTime = (this.metrics.averageAnimationTime * 0.95) + (animationTime * 0.05);
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
        this.symbolAnimations.clearAll();
        this.colorAnimations.clearAll();
        this.valueAnimations.clearAll();

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

    public addSymbolAnimation(id: string, config: Omit<SymbolAnimationConfig, 'running'>): void {
        this.symbolAnimations.add(id, config);
    }

    private updateSymbolAnimations(timestamp: number): void {
        this.symbolAnimations.update(timestamp);
    }

    private updateColorAnimations(timestamp: number): void {
        this.colorAnimations.update(timestamp);
    }

    public addColorAnimation(id: string, config: Omit<ColorAnimationConfig, 'running'>): void {
        this.colorAnimations.add(id, config);
    }

    public addValueAnimation(id: string, config: Omit<ValueAnimationConfig, 'running'>): void {
        this.valueAnimations.add(id, config);
    }

    private updateValueAnimations(timestamp: number): void {
        this.valueAnimations.update(timestamp);
    }

    public setViewport(x: number, y: number, options?: { 
        smooth?: boolean;
        duration?: number;
        easing?: (t: number) => number;
    }) {
        // Clamp target position to ensure viewport stays within world bounds
        const targetX = Math.floor(Math.max(0, Math.min(x, this.worldWidth - this.viewport.width)));
        const targetY = Math.floor(Math.max(0, Math.min(y, this.worldHeight - this.viewport.height)));

        if (options?.smooth) {
            // Start a new viewport animation
            this.viewportAnimation = {
                startX: this.viewport.x,
                startY: this.viewport.y,
                endX: targetX,    // Using clamped values
                endY: targetY,    // Using clamped values
                startTime: performance.now(),
                duration: options.duration || 0.1,
                easing: options.easing || Easing.quadOut
            };
            this.hasChanges = true;
        } else {
            // Immediate update with clamped values
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
            // Animation complete - do one final reposition check
            this.viewport.x = this.viewportAnimation.endX;
            this.viewport.y = this.viewportAnimation.endY;
            this.viewportAnimation = undefined;
            this.updateRenderCanvas();  // Final update with reposition check enabled
        } else {
            // Update viewport position during animation
            const easedProgress = this.viewportAnimation.easing(progress);
            this.viewport.x = this.viewportAnimation.startX + 
                (this.viewportAnimation.endX - this.viewportAnimation.startX) * easedProgress;
            this.viewport.y = this.viewportAnimation.startY + 
                (this.viewportAnimation.endY - this.viewportAnimation.startY) * easedProgress;
        }
        
        this.hasChanges = true;
    }

    public clearAnimations(id: string): void {
        this.symbolAnimations.clear(id);
        this.colorAnimations.clear(id);
        this.valueAnimations.clear(id);
        
        logger.verbose(`Cleared all animations for tile ${id}`);
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

    public stopTileAnimations(id: string): void {
        this.symbolAnimations.stop(id);
        this.colorAnimations.stop(id);
        this.valueAnimations.stop(id);
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

    public addFrameCallback(callback: (display: Display, timestamp: number) => void): void {
        this.frameCallbacks.add(callback);
    }

    public removeFrameCallback(callback: (display: Display, timestamp: number) => void): void {
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
        const PADDING_FACTOR = 0.1;  // 10% padding on each side
        const paddingX = Math.ceil(this.viewport.width * PADDING_FACTOR);
        const paddingY = Math.ceil(this.viewport.height * PADDING_FACTOR);
        
        // Skip reposition check during viewport animations
        const needsReposition = !this.viewportAnimation && (
            // Left edge: viewport is less than padding distance from render bounds left
            this.viewport.x - this.renderBounds.x < paddingX ||
            
            // Right edge: viewport right edge is less than padding from render bounds right
            (this.renderBounds.x + this.renderBounds.width) - (this.viewport.x + this.viewport.width) < paddingX ||
            
            // Top edge: viewport is l  ess than padding distance from render bounds top
            this.viewport.y - this.renderBounds.y < paddingY ||
            
            // Bottom edge: viewport bottom edge is less than padding from render bounds bottom
            (this.renderBounds.y + this.renderBounds.height) - (this.viewport.y + this.viewport.height) < paddingY
        );

        if (needsReposition) {
            // logger.info(`Reposition check:
            //     viewport: (${this.viewport.x}, ${this.viewport.y}, ${this.viewport.width}, ${this.viewport.height})
            //     renderBounds: (${this.renderBounds.x}, ${this.renderBounds.y}, ${this.renderBounds.width}, ${this.renderBounds.height})
            //     padding: ${paddingX},${paddingY}
            //     left: ${this.viewport.x - this.renderBounds.x < paddingX}
            //     right: ${(this.renderBounds.x + this.renderBounds.width) - (this.viewport.x + this.viewport.width) < paddingX}
            //     top: ${this.viewport.y - this.renderBounds.y < paddingY}
            //     bottom: ${(this.renderBounds.y + this.renderBounds.height) - (this.viewport.y + this.viewport.height) < paddingY}
            // `);

            // Calculate render bounds size in cells (with double padding on each side)
            const renderWidthInCells = Math.min(
                this.worldWidth,
                Math.ceil(this.viewport.width * (1 + 4 * PADDING_FACTOR))  // Double the padding
            );
            const renderHeightInCells = Math.min(
                this.worldHeight,
                Math.ceil(this.viewport.height * (1 + 4 * PADDING_FACTOR))  // Double the padding
            );
            
            // Center the viewport within the render bounds with extra padding
            this.renderBounds.x = Math.max(0, Math.min(
                Math.floor(this.viewport.x - (renderWidthInCells - this.viewport.width) / 2),
                this.worldWidth - renderWidthInCells
            ));
            
            this.renderBounds.y = Math.max(0, Math.min(
                Math.floor(this.viewport.y - (renderHeightInCells - this.viewport.height) / 2),
                this.worldHeight - renderHeightInCells
            ));

            this.renderBounds.width = renderWidthInCells;
            this.renderBounds.height = renderHeightInCells;

            // Update mask canvas size to match render canvas
            this.maskCanvas.width = this.renderCanvas.width;
            this.maskCanvas.height = this.renderCanvas.height;
            
            this.renderVisibilityMask();

        }

        // Clear the entire render canvas once
        this.renderCtx.clearRect(0, 0, this.renderCanvas.width, this.renderCanvas.height);

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
            
            tiles.forEach(tile => this.renderTile(tile, renderX, renderY));
        }

        // After rendering all tiles, apply the visibility mask
        this.applyVisibilityMask();
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

    /**
     * Get the internal render canvas for debugging/visualization purposes.
     * This is the larger canvas that contains the full render area including padding.
     */
    public getRenderCanvas(): HTMLCanvasElement {
        return this.renderCanvas;
    }

    public getTilesAt(x: number, y: number): Tile[] {
        return Array.from(this.tileMap.values())
            .filter(tile => tile.x === x && tile.y === y)
            .sort((a, b) => a.zIndex - b.zIndex);
    }

    public setVisibilityMask(mask: number[][]): void {
        if (mask.length !== this.worldHeight || mask[0].length !== this.worldWidth) {
            throw new Error('Visibility mask dimensions must match world dimensions');
        }
        this.visibilityMask = mask;
        this.maskDirty = true;
        this.hasChanges = true;
    }

    public setVisibility(x: number, y: number, value: number): void {
        if (x >= 0 && x < this.worldWidth && y >= 0 && y < this.worldHeight) {
            this.visibilityMask[y][x] = Math.max(0, Math.min(1, value));
            this.maskDirty = true;
            this.hasChanges = true;
        }
    }

    public clearVisibilityMask(): void {
        this.visibilityMask = Array(this.worldHeight).fill(0)
            .map(() => Array(this.worldWidth).fill(0));
        this.hasChanges = true;
    }
    public getVisibilityMask(): number[][] {
        return this.visibilityMask;
    }

    // Cases to re-render the mask:
    // 1. If the viewport has moved, we need to re-apply, but if we have not exceeded the threshold to shift the render bounds, 
    //    we can just re-apply the mask.
    // 2. If the visibility mask has changed, we have to re-render. We will re-apply on the next application.

    private renderVisibilityMask(): void {
        // Clear the mask canvas
        this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        
        // Initialize visibility mask if it doesn't exist
        if (!this.visibilityMask) {
            this.visibilityMask = Array(this.worldHeight).fill(1)
                .map(() => Array(this.worldWidth).fill(1));  // Default to fully visible (1)
        }

        // Set blend mode for darkness overlay
        this.maskCtx.globalCompositeOperation = 'source-over';

        // logger.info(`Visibility mask: ${this.visibilityMask}`);

        // Render visibility mask for visible area, accounting for render bounds offset
        for (let y = 0; y < this.renderBounds.height; y++) {
            for (let x = 0; x < this.renderBounds.width; x++) {
                const worldX = Math.floor(x + this.renderBounds.x);
                const worldY = Math.floor(y + this.renderBounds.y);
                
                if (worldY >= 0 && worldY < this.worldHeight && worldX >= 0 && worldX < this.worldWidth) {
                    const darkness = 1 - (this.visibilityMask[worldY][worldX]);

                    if (darkness > 0) {
                        this.maskCtx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
                        this.maskCtx.fillRect(
                            x * this.cellWidthScaled,
                            y * this.cellHeightScaled,
                            this.cellWidthScaled,
                            this.cellHeightScaled
                        );
                    }
                }
            }
        }

        this.maskDirty = false;
    }

    private applyVisibilityMask(): void {
        // Only update the mask canvas if the visibility mask has changed
        if (this.maskDirty) {
            this.renderVisibilityMask();
        }

        // Apply the cached mask to the render canvas
        this.renderCtx.save();
        this.renderCtx.globalCompositeOperation = 'source-over';
        this.renderCtx.drawImage(this.maskCanvas, 0, 0);
        this.renderCtx.restore();
    }

    public getMaskCanvas(): HTMLCanvasElement | null {
        return this.maskCanvas;
    }

    private shouldRenderTile(tile: Tile): boolean {
        // Check current position visibility
        const currentVisibility = this.visibilityMask[tile.y]?.[tile.x];
        
        // For animated tiles, also check target position
        let targetVisibility = currentVisibility;
        const valueAnims = this.valueAnimations.get(tile.id);
        if (valueAnims) {
            if (valueAnims.x || valueAnims.y) {
                // Calculate the target position

                // this is probematic because it makes assumptions about the value animation behavior
                // and if we are implement Transform functions. I think for now we can get away with 
                // simply using range instead. but there are potentially bad cases here for x/y
                // animations that have greater than 1 range. 


                // TODO: consider also folding the transform function into this calculation

                // this gets unnecessarily complex because we have to test for range/offset versus start/end
                // but for now it's faster than a total refactor.


                let rangeX: number = 0;
                if(valueAnims.x?.range) {
                    rangeX = valueAnims.x.range;
                } else if(valueAnims.x?.end && valueAnims.x?.start) {
                    rangeX = valueAnims.x.end - valueAnims.x.start;
                } else {
                    logger.warn(`No range or start/end for x animation ${tile.id}`);
                }
 
                let rangeY: number = 0;
                if(valueAnims.y?.range) {
                    rangeY = valueAnims.y.range;
                } else if(valueAnims.y?.end && valueAnims.y?.start) {
                    rangeY = valueAnims.y.end - valueAnims.y.start;
                } else {
                    logger.warn(`No range or start/end for y animation ${tile.id}`);
                }

                const targetX = valueAnims.x ? 
                    Math.round(tile.x + (rangeX)) : 
                    tile.x;
                const targetY = valueAnims.y ? 
                    Math.round(tile.y + (rangeY)) : 
                    tile.y;
                
                // Check visibility at target position
                const targetPosVisibility = this.visibilityMask[targetY]?.[targetX];
                // Use the higher visibility value between current and target positions
                targetVisibility = Math.max(currentVisibility ?? 0, targetPosVisibility ?? 0);
            }
        }

        // If no visibility data at either position, don't render
        if (targetVisibility === undefined) {
            return false;
        }

        // Fully visible (1.0) - always render
        if (targetVisibility === 1) {
            return true;
        }

        // Partially visible (0 < v < 1)
        if (targetVisibility > 0) {
            // Only render if alwaysRenderIfExplored is true
            return tile.alwaysRenderIfExplored === true;
        }

        // Not visible (0) - don't render
        return false;
    }

    private updateTileProperty<K extends keyof Tile>(tileId: TileId, property: K, value: Tile[K]): void {
        logger.info(`Updating tile property ${property} to ${value} for tile ${tileId}`);

        const tile = this.tileMap.get(tileId);

        
        if (tile && tile[property] !== value) {
            this.hasChanges = true;
            tile[property] = value;
            this.dirtyMask.markDirty(tile);
        }
    }

    private requestFrame(): void {
        requestAnimationFrame((timestamp) => {
            // Existing animation updates
            this.symbolAnimations.update(timestamp);
            this.colorAnimations.update(timestamp);
            this.valueAnimations.update(timestamp);
            
            // Continue the animation loop
            if (this.isRunning) {
                this.requestFrame();
            }
        });
    }
} 

export { BlendMode };
