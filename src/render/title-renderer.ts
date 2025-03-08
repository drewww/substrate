import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { MetricsComponent } from '../game/components/metrics.component';
import { World } from '../world/world';

export class TitleRenderer implements Renderer {
    private titleBackground: HTMLImageElement;

    constructor(
        private readonly display: Display,
        private readonly world: World
    ) {
        this.titleBackground = document.getElementById('title-background') as HTMLImageElement;
        if (!this.titleBackground) {
            throw new Error('Title background image not found');
        }
        this.world = world;
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
                delayBetweenChars: 0.10,
                initialDelay: 0.0
            }
        });

        this.display.createString(this.display.getViewportWidth() - 21, 6, '{w}[t]rain{/}', 1000, {
            animate: {
                delayBetweenChars: 0.10,
                initialDelay: 0.0
            }
        });

        this.display.createString(this.display.getViewportWidth() - 21, 7, '{w}[c]redits{/}', 1000, {
            animate: {
                delayBetweenChars: 0.10,
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

        this.display.createString(6, 3, '{#w}GAME OVER{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.2,
                initialDelay: 0.1
            }
        });

        // Add metrics below GAME OVER
        const metrics = this.world.getPlayer().getComponent('metrics') as MetricsComponent;
        if (metrics) {
            const metricsData = [
                { label: 'Tiles Traveled', value: metrics.tilesTraveled },
                { label: 'Times Crashed', value: metrics.timesCrashed },
                { label: 'Objectives Secured', value: metrics.objectivesSecured },
                { label: 'Tiles Drifted', value: metrics.tilesDrifted }
            ];

            metricsData.forEach((metric, index) => {
                // Label in gray
                this.display.createString(
                    6,
                    6 + (index * 2),
                    `{#999999}${metric.label}:{/}`,
                    1000,
                    {
                        backgroundColor: '#00000000',
                        animate: {
                            delayBetweenChars: 0.05,
                            initialDelay: 0.5 + (index * 0.3)
                        }
                    }
                );

                // Value in red
                this.display.createString(
                    6 + metric.label.length + 2,
                    6 + (index * 2),
                    `{#FF4444}${metric.value}{/}`,
                    1000,
                    {
                        backgroundColor: '#00000000',
                        animate: {
                            delayBetweenChars: 0.05,
                            initialDelay: 0.5 + (index * 0.3) + 0.2
                        }
                    }
                );
            });
        }

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

        const rightX = this.display.getViewportWidth() - 42;
        
        this.display.createString(rightX, 3, '{#55CE4A}MISSION COMPLETE{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.2,
                initialDelay: 0.1
            }
        });

        // Add metrics below MISSION COMPLETE
        const metrics = this.world.getPlayer().getComponent('metrics') as MetricsComponent;
        if (metrics) {
            const metricsData = [
                { label: 'Tiles Traveled', value: metrics.tilesTraveled },
                { label: 'Times Crashed', value: metrics.timesCrashed },
                { label: 'Objectives Secured', value: metrics.objectivesSecured },
                { label: 'Tiles Drifted', value: metrics.tilesDrifted }
            ];

            metricsData.forEach((metric, index) => {
                // Label in white
                this.display.createString(
                    rightX,
                    6 + (index * 2),
                    `{#FFFFFF}${metric.label}:{/}`,
                    1000,
                    {
                        backgroundColor: '#00000000',
                        animate: {
                            delayBetweenChars: 0.05,
                            initialDelay: 0.5 + (index * 0.3)
                        }
                    }
                );

                // Value in bright green
                this.display.createString(
                    rightX + metric.label.length + 2,
                    6 + (index * 2),
                    `{#55CE4A}${metric.value}{/}`,
                    1000,
                    {
                        backgroundColor: '#00000000',
                        animate: {
                            delayBetweenChars: 0.05,
                            initialDelay: 0.5 + (index * 0.3) + 0.2
                        }
                    }
                );
            });
        }

        this.titleBackground.style.display = 'block';
        this.titleBackground.style.visibility = 'visible';
    }

    public showMetrics(player: Entity): void {
        const metrics = player.getComponent('metrics') as MetricsComponent;
        if (!metrics) return;

        // Create dark rectangle background for metrics
        for (let y = 2; y < this.display.getViewportHeight() - 2; y++) {
            for (let x = this.display.getViewportWidth() - 44; x < this.display.getViewportWidth() - 4; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }

        const startX = this.display.getViewportWidth() - 42;
        const startY = 3;
        const delayBetweenLines = 0.5; // Half second between each line

        // Create header
        this.display.createString(
            startX, 
            startY, 
            '{#55CE4A}MISSION STATISTICS{/}', 
            1000,
            {
                fontWeight: 'bold',
                backgroundColor: '#00000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.1
                }
            }
        );

        // Create metrics list
        const metricsData = [
            { label: 'Tiles Traveled', value: metrics.tilesTraveled },
            { label: 'Times Crashed', value: metrics.timesCrashed },
            { label: 'Objectives Secured', value: metrics.objectivesSecured },
            { label: 'Tiles Drifted', value: metrics.tilesDrifted }
        ];

        metricsData.forEach((metric, index) => {
            // Label in white
            this.display.createString(
                startX,
                startY + 2 + (index * 2),
                `{#FFFFFF}${metric.label}:{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: delayBetweenLines * (index + 1)
                    }
                }
            );

            // Value in cyan
            this.display.createString(
                startX + metric.label.length + 2,
                startY + 2 + (index * 2),
                `{#00FFFF}${metric.value}{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: delayBetweenLines * (index + 1) + 0.2 // Slight delay after label
                    }
                }
            );
        });
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
} 