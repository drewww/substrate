import { TextParser } from './util/text-parser';
import { Color, Tile, TileId, Viewport, SymbolAnimation, ColorAnimation, ValueAnimation, ColorAnimationOptions, TileConfig, ValueAnimationOption, ValueAnimationsOptions } from './types';
import { interpolateColor } from './util/color';
import { logger } from './util/logger';

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
    
    private textParser: TextParser;

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
        
        this.worldCanvas = document.createElement('canvas');
        this.worldCtx = this.worldCanvas.getContext('2d')!;

        const displayWidth = options.viewportWidth * this.cellWidthCSS;
        const displayHeight = options.viewportHeight * this.cellHeightCSS;

        [this.displayCanvas, this.worldCanvas].forEach(canvas => {
            canvas.style.width = `${displayWidth}px`;
            canvas.style.height = `${displayHeight}px`;
            canvas.width = displayWidth * this.scale;
            canvas.height = displayHeight * this.scale;
        });

        [this.displayCtx, this.worldCtx].forEach(ctx => {
            ctx.scale(this.scale, this.scale);
        });

        this.cellWidthScaled = options.cellWidth * this.scale;
        this.cellHeightScaled = options.cellHeight * this.scale;
        
        this.displayCanvas.width = options.viewportWidth * this.cellWidthScaled;
        this.displayCanvas.height = options.viewportHeight * this.cellHeightScaled;
        
        this.worldCanvas.width = options.worldWidth * this.cellWidthScaled;
        this.worldCanvas.height = options.worldHeight * this.cellHeightScaled;
        
        this.displayCanvas.style.width = `${options.viewportWidth * this.cellWidthCSS}px`;
        this.displayCanvas.style.height = `${options.viewportHeight * this.cellHeightCSS}px`;

        [this.displayCtx, this.worldCtx].forEach(ctx => {
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
            averageWorldUpdateTime: 0
        };

        this.textParser = new TextParser({
            'r': '#FF0000FF',  // red
            'g': '#00FF00FF',  // green
            'b': '#0088FFFF',  // blue
            'y': '#FFFF00FF',  // yellow
            'm': '#FF00FFFF',  // magenta
            'w': '#FFFFFFFF',  // white
        });

        logger.info('Display initialization complete');

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
                logger.warn(`Attempted to move non-existent tile: ${tileId}`);
                return;
            }

            if (newX < 0 || newX >= this.worldWidth || newY < 0 || newY >= this.worldHeight) {
                logger.warn(`Attempted to move tile outside bounds: (${newX},${newY})`);
                return;
            }

            logger.verbose(`Moving tile ${tileId} to (${newX},${newY})`);
            tile.x = newX;
            tile.y = newY;
        }
    }

    public removeTile(tileId: TileId): void {
        if (this.tileMap.has(tileId)) {
            this.hasChanges = true;
            if (!this.tileMap.has(tileId)) {
                logger.warn(`Attempted to remove non-existent tile: ${tileId}`);
                return;
            }
            
            logger.verbose(`Removing tile ${tileId}`);
            this.animations.delete(tileId);
            this.tileMap.delete(tileId);
        }
    }

    private updateWorldCanvas(): void {
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
        
        const sortedTiles = Array.from(this.tileMap.values())
            .sort((a, b) => a.zIndex - b.zIndex);

        sortedTiles.forEach(tile => {
            this.renderTile(tile);
        });
    }

    private renderTile(tile: Tile): void {
        const pixelX = tile.x * this.cellWidthScaled;
        const pixelY = tile.y * this.cellHeightScaled;
        
        this.worldCtx.save();
        this.worldCtx.translate(pixelX, pixelY);
        
        if (!tile.noClip) {
            this.worldCtx.beginPath();
            this.worldCtx.rect(0, 0, this.cellWidthScaled, this.cellHeightScaled);
            this.worldCtx.clip();
        }
        
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
        
        if (tile.char && tile.color) {
            const offsetX = (tile.offsetSymbolX || 0) * this.cellWidthScaled;
            const offsetY = (tile.offsetSymbolY || 0) * this.cellHeightScaled;
            
            this.worldCtx.save();
            
            this.worldCtx.translate(this.cellWidthScaled/2, this.cellHeightScaled * 0.55);
            
            this.worldCtx.scale(tile.scaleSymbolX, tile.scaleSymbolY);
            
            this.worldCtx.translate(offsetX, offsetY);
            
            this.worldCtx.fillStyle = tile.color;
            this.worldCtx.fillText(tile.char, 0, 0);
            
            this.worldCtx.restore();
        }

        this.worldCtx.restore();
    }

    private renderFrame(timestamp: number): void {
        const animationStart = performance.now();
        
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

        if (this.hasChanges) {
            this.updateWorldCanvas();
            this.hasChanges = false;
        }
        
        this.updateDisplayCanvas();

        const renderEnd = performance.now();

        this.metrics.symbolAnimationCount = this.animations.size;
        this.metrics.colorAnimationCount = this.colorAnimations.size;
        this.metrics.valueAnimationCount = this.valueAnimations.size;
        
        this.metrics.lastAnimationUpdateTime = animationEnd - animationStart;
        this.metrics.lastWorldUpdateTime = renderEnd - renderStart;
        
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
        logger.info('Clearing display');
        
        this.tileMap.clear();
        this.animations.clear();
        this.colorAnimations.clear();
        this.valueAnimations.clear();

        this.displayCtx.clearRect(0, 0, this.displayCanvas.width, this.displayCanvas.height);
        this.worldCtx.clearRect(0, 0, this.worldCanvas.width, this.worldCanvas.height);
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
        reverse: boolean = false, 
        offset: number = 0,
        startTime?: number
    ): void {
        if (!this.tileMap.has(tileId)) {
            logger.warn(`Attempted to add animation to non-existent tile: ${tileId}`);
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
                
                if (animations.fg.loop) {
                    if (animations.fg.reverse) {
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
                
                tile.color = interpolateColor(animations.fg.startColor, animations.fg.endColor, progress);

                // Remove animation if complete and not looping
                if (!animations.fg.loop && progress >= 1) {
                    delete animations.fg;
                }
            }
            
            if (animations.bg) {
                const elapsed = (timestamp - animations.bg.startTime) / 1000;
                let progress = (elapsed / animations.bg.duration) + animations.bg.offset;
                
                if (animations.bg.loop) {
                    if (animations.bg.reverse) {
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
                
                tile.backgroundColor = interpolateColor(animations.bg.startColor, animations.bg.endColor, progress);

                // Remove animation if complete and not looping
                if (!animations.bg.loop && progress >= 1) {
                    delete animations.bg;
                }
            }

            // Clean up if no animations remain
            if (!animations.fg && !animations.bg) {
                this.colorAnimations.delete(tileId);
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
                loop: options.fg.loop || false,
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
                loop: options.bg.loop || false,
                offset: options.bg.offset || 0
            };
        }
        
        this.colorAnimations.set(tileId, animations);
    }

    private createValueAnimation(config: ValueAnimationOption, startTime: number): ValueAnimation {
        return {
            startValue: config.start,
            endValue: config.end,
            duration: config.duration,
            startTime: startTime,
            reverse: config.reverse || false,
            offset: config.offset || 0,
            easing: config.easing || Easing.linear,
            loop: config.loop ?? true
        };
    }

    public addValueAnimation(tileId: TileId, options: ValueAnimationsOptions): void {
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

                const easedProgress = animation.easing ? 
                    animation.easing(progress) : 
                    progress;

                tile[property] = animation.startValue + 
                    (animation.endValue - animation.startValue) * easedProgress;
                
                // Remove animation if complete and not looping
                if (!animation.loop && progress >= 1) {
                    return true; // Animation complete
                }
                
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
            logger.debug(`Setting viewport to (${x},${y})`);
            
            this.viewport.x = Math.max(0, Math.min(x, this.worldWidth - this.viewport.width));
            this.viewport.y = Math.max(0, Math.min(y, this.worldHeight - this.viewport.height));
        }
    }

    public clearAnimations(tileId: TileId): void {
        this.animations.delete(tileId);
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
} 