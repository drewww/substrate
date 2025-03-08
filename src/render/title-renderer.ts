import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';

export class TitleRenderer implements Renderer {
    private titleBackground: HTMLImageElement;

    constructor(private readonly display: Display) {
        this.titleBackground = document.getElementById('title-background') as HTMLImageElement;
        if (!this.titleBackground) {
            throw new Error('Title background image not found');
        }
    }

    public showTitle(): void {
        // Clear any existing content
        this.display.clear();

        // Create the dark rectangle background
        for (let y = 2; y < this.display.getViewportHeight() - 2; y++) {
            for (let x = this.display.getViewportWidth() - 25; x < this.display.getViewportWidth() - 4; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }

        this.display.createString(this.display.getViewportWidth() - 23, 3, '{#999999}RUNNER_2/{/}{#w}RUNTIME{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
        });

        this.display.createString(this.display.getViewportWidth() - 21, 5, '{w}[r]un{/}', 1000, {
            animate: {
                delayBetweenChars: 0.15,
                initialDelay: 0.0
            }
        });

        this.display.createString(this.display.getViewportWidth() - 21, 6, '{w}[t]rain{/}', 1000, {
            animate: {
                delayBetweenChars: 0.15,
                initialDelay: 0.0
            }
        });

        this.display.createString(this.display.getViewportWidth() - 21, 7, '{w}[c]redits{/}', 1000, {
            animate: {
                delayBetweenChars: 0.15,
                initialDelay: 0.0
            }
        });
    }

    public showDeath(): void {
        // Clear any existing content
        this.display.clear();

        // Calculate center position
        const centerX = Math.floor(this.display.getViewportWidth() / 2) - 4; // "GAME OVER" is 9 chars, so offset by 4
        const centerY = Math.floor(this.display.getViewportHeight() / 2);

        this.display.createString(centerX, centerY, '{#FF0000}GAME OVER{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.1,
                initialDelay: 0.5
            }
        });
    }

    public hide(): void {
        this.display.getRenderCanvas().style.display = 'none';
        this.titleBackground.style.display = 'none';
    }

    public show(): void {
        this.display.getRenderCanvas().style.display = 'block';
        this.titleBackground.style.display = 'block';
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
} 