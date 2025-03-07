import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';

export class TitleRenderer implements Renderer {
    constructor(private readonly display: Display) {
        this.initializeTitle();
    }

    private initializeTitle(): void {
        // Fill the entire display with pink background for now

        // on the right side of the screen, put a rectangle that has padding 2 from the edges and is ... 15 tiles wide.
        // top to bottom.
        for (let y = 2; y < this.display.getViewportHeight() - 2; y++) {
            for (let x = this.display.getViewportWidth() - 25; x < this.display.getViewportWidth() - 4; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#00000044', 1000);
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

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}

    public hide(): void {
        this.display.getRenderCanvas().style.display = 'none';
    }

    public show(): void {
        this.display.getRenderCanvas().style.display = 'block';
    }
} 