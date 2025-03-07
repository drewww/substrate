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
        for (let y = 0; y < this.display.getViewportHeight(); y++) {
            for (let x = 0; x < this.display.getViewportWidth(); x++) {
                this.display.createTile(
                    x,
                    y,
                    ' ',
                    '#FFFFFF00',  // transparent foreground
                    '#FF69B4FF',  // hot pink background
                    1000
                );
            }
        }
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
} 