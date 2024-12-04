import { BaseTest } from './base-test';
import { Color, TileId, BlendMode } from '../../types';
import { FillDirection } from '../../display';

interface WipeConfig {
    color: Color;
    blendMode: BlendMode;
}

export class WipeTest extends BaseTest {
    private readonly wipeConfigs: WipeConfig[] = [
        { 
            color: '#FF0000AA', 
            blendMode: BlendMode.Screen
        },
        { 
            color: '#00FF00AA', 
            blendMode: BlendMode.Overlay
        },
        { 
            color: '#0000FFAA', 
            blendMode: BlendMode.HardLight
        },
        { 
            color: '#FFFF00AA', 
            blendMode: BlendMode.Multiply
        }
    ];
    
    private currentWipeIndex: number = 0;
    private wipePosition: number = 0;
    private wipeActive: boolean = false;
    private tileIds: TileId[] = [];
    private wipeOverlayIds: TileId[] = [];
    private startTime: number = 0;
    private readonly wipeSpeed: number = 1.0;

    constructor() {
        super({
            worldWidth: 70,
            worldHeight: 25,
            viewportWidth: 70,
            viewportHeight: 25,
            cellWidth: 12,
            cellHeight: 24,
        });
    }

    getName(): string {
        return "wipe";
    }

    getDescription(): string {
        return "Demonstrates blend modes with overlapping color wipes";
    }

    private updateWipes(timestamp: number) {
        if (!this.isRunning || !this.wipeActive) return;

        const height = this.display.getWorldHeight();
        const config = this.wipeConfigs[this.currentWipeIndex];

        // Create new column of tiles
        for (let y = 0; y < height; y++) {
            const tileId = this.display.createTile(
                Math.floor(this.wipePosition),
                y,
                ' ',
                '#00000000',
                config.color,
                100,
                { 
                    fillDirection: FillDirection.BOTTOM,
                    blendMode: config.blendMode
                }
            );
            this.wipeOverlayIds.push(tileId);
        }

        // Update position
        this.wipePosition += this.wipeSpeed;

        // Check if this wipe is complete
        if (this.wipePosition >= this.display.getWorldWidth()) {
            this.wipeActive = false;
            
            // Wait 1 second, clear tiles, then wait another second before next color
            setTimeout(() => {
                this.wipeOverlayIds.forEach(id => this.display.removeTile(id));
                this.wipeOverlayIds = [];
                
                setTimeout(() => {
                    // Move to next color
                    this.currentWipeIndex = (this.currentWipeIndex + 1) % this.wipeConfigs.length;
                    this.wipePosition = 0;
                    this.wipeActive = true;
                    requestAnimationFrame((t) => this.updateWipes(t));
                }, 1000);
            }, 1000);
        } else {
            requestAnimationFrame((t) => this.updateWipes(t));
        }
    }

    protected run(): void {
        this.currentWipeIndex = 0;
        this.wipePosition = 0;
        this.wipeActive = true;
        this.wipeOverlayIds = [];
        this.fillRandomBackground();
        this.startTime = performance.now();
        requestAnimationFrame((t) => this.updateWipes(t));
    }

    protected cleanup(): void {
        this.tileIds.forEach(id => this.display.removeTile(id));
        this.wipeOverlayIds.forEach(id => this.display.removeTile(id));
        this.tileIds = [];
        this.wipeOverlayIds = [];
        this.wipeActive = false;
    }

    private getRandomASCII(): string {
        return String.fromCharCode(33 + Math.floor(Math.random() * 94));
    }

    private getRandomColor(): Color {
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}FF`;
    }

    private fillRandomBackground() {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create random background tiles
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const tileId = this.display.createTile(
                    x,
                    y,
                    this.getRandomASCII(),
                    this.getRandomColor(),
                    this.getRandomColor(),
                    1
                );
                this.tileIds.push(tileId);
            }
        }
    }
} 