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

    public prepareDeath(): void {
        this.titleBackground.src = '../assets/img/death_max.png';
    }

    public showDeath(): void {

        // Clear any existing content
        this.display.clear();

        for (let y = 2; y < this.display.getViewportHeight() - 2; y++) {
            for (let x = 4; x < 4 + 40; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }


        // Calculate center position
        const centerX = Math.floor(this.display.getViewportWidth() / 2) - 4; // "GAME OVER" is 9 chars, so offset by 4
        const centerY = Math.floor(this.display.getViewportHeight() / 2);

        this.display.createString(6, 3, '{#w}GAME OVER{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.2,
                initialDelay: 0.1
            }
        });

        this.titleBackground.style.display = 'block';
        this.titleBackground.style.visibility = 'visible';
    }

    public hide(): void {
        this.display.getDisplayCanvas().style.display = 'none';
        this.titleBackground.style.display = 'none';
    }

    public show(): void {
        this.display.getDisplayCanvas().style.display = 'block';
        this.display.getDisplayCanvas().style.visibility = 'visible';
        this.titleBackground.style.display = 'block';
        this.titleBackground.style.visibility = 'visible';
    }

    public prepareVictory(): void {
        this.titleBackground.src = '../assets/img/victory_max.png';  // Assuming you'll add this image
    }

    public showVictory(): void {
        // Clear any existing content
        this.display.clear();

        // Create dark rectangle background on the right side
        for (let y = 2; y < this.display.getViewportHeight() - 2; y++) {
            for (let x = this.display.getViewportWidth() - 44; x < this.display.getViewportWidth() - 4; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }

        // Position text on the right side
        const rightX = this.display.getViewportWidth() - 42; // Adjust this value to position the text
        
        this.display.createString(rightX, 3, '{#55CE4A}MISSION COMPLETE{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.2,
                initialDelay: 0.1
            }
        });

        this.titleBackground.style.display = 'block';
        this.titleBackground.style.visibility = 'visible';
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
} 