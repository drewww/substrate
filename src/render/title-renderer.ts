import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { MetricsComponent } from '../game/components/metrics.component';
import { World } from '../world/world';
import { logger } from '../util/logger';

export enum TitleMode {
    TITLE,
    DEATH,
    VICTORY,
    CREDITS
}

export class TitleRenderer implements Renderer {
    private titleBackground: HTMLImageElement;
    private readonly CREDITS = [
        {
            name: 'Drew Harry',
            roles: ['Game Design', 'Programming', 'Level Design']
        },
        {
            name: 'Mike Saunders',
            roles: ['Art']
        },

        {
            name: 'Jay Harry',
            roles: ['Playtesting', 'Visual Design', 'Level Design']
        },

        {
            name: 'Bailey Rosser',
            roles: ['Level Design', 'Visual Design']
        }
    ];
    currentMode: TitleMode = TitleMode.TITLE;

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

    public prepare(mode: TitleMode): void {
        switch(mode) {
            case TitleMode.TITLE:
                this.titleBackground.src = '../assets/img/title_max.png';
                break;
            case TitleMode.DEATH:
                this.titleBackground.src = '../assets/img/death_max.png';
                break;
            case TitleMode.VICTORY:
            case TitleMode.CREDITS:
                this.titleBackground.src = '../assets/img/victory_max.png';
                break;
        }
    }

    public show(mode: TitleMode): void {
        this.display.clear();

        logger.info(`Showing title screen: ${mode}`);
        
        switch(mode) {
            case TitleMode.TITLE:
                this.renderTitleScreen();
                break;
            case TitleMode.DEATH:
                this.renderDeathScreen();
                break;
            case TitleMode.VICTORY:
                this.renderVictoryScreen();
                break;
            case TitleMode.CREDITS:
                this.renderCreditsScreen();
                break;
        }

        this.titleBackground.style.display = 'block';
        this.titleBackground.style.visibility = 'visible';

        this.display.getDisplayCanvas().style.display = 'block';
        this.display.getDisplayCanvas().style.visibility = 'visible';

        this.currentMode = mode;
    }

    private renderTitleScreen(): void {
        this.createDarkBackground(
            this.display.getViewportWidth() - 25,
            this.display.getViewportWidth() - 4,
            2,
            this.display.getViewportHeight() - 2
        );

        this.display.createString(this.display.getViewportWidth() - 23, 3, '{#999999}RUNNER_2/{/}{#w}RUNTIME{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
        });

        const menuItems = [
            '{w}[r]un{/}',
            '{w}[t]rain{/}',
            '{w}[c]redits{/}'
        ];

        menuItems.forEach((item, index) => {
            this.display.createString(this.display.getViewportWidth() - 21, 5 + index, item, 1000, {
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        });
    }

    private renderDeathScreen(): void {
        this.createDarkBackground(4, 44, 2, this.display.getViewportHeight() - 2);

        this.display.createString(6, 3, '{#w}GAME OVER{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        this.renderMetrics(6, 6, '#999999', '#FF4444');
    }

    private renderVictoryScreen(): void {
        this.createDarkBackground(
            this.display.getViewportWidth() - 44,
            this.display.getViewportWidth() - 4,
            2,
            this.display.getViewportHeight() - 2
        );

        const rightX = this.display.getViewportWidth() - 42;
        
        this.display.createString(rightX, 3, '{#55CE4A}MISSION COMPLETE{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        this.renderMetrics(rightX, 6, '#FFFFFF', '#55CE4A');
    }

    private renderCreditsScreen(): void {
        const leftX = this.display.getViewportWidth() - 60;
        const rightX = this.display.getViewportWidth() - 4;

        this.createDarkBackground(
            leftX,
            rightX,
            2,
            this.display.getViewportHeight() - 2
        );
        
        this.display.createString(leftX + 1, 3, '{#999999}RUNNER_2/{/}{#w}RUNTIME{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        let currentY = 6;
        this.CREDITS.forEach((credit, index) => {
            this.display.createString(
                leftX + 2,
                currentY,
                `{#w}${credit.name}{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    animate: {
                        delayBetweenChars: 0.1,
                        initialDelay: 0.5 + (index * 0.2)
                    }
                }
            );

            credit.roles.forEach((role, roleIndex) => {
                this.display.createString(
                    leftX + 18,
                    currentY + roleIndex,
                    `{#00D3EF}${role}{/}`,
                    1000,
                    {
                        backgroundColor: '#00000000',
                        animate: {
                            delayBetweenChars: 0.05,
                            initialDelay: 0.5 + (index * 0.2) + (roleIndex * 0.1)
                        }
                    }
                );
            });

            currentY += credit.roles.length + 1;
        });
    }

    private createDarkBackground(startX: number, endX: number, startY: number, endY: number): void {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }
    }
    
    public getCurrentMode(): TitleMode {
        return this.currentMode;
    }

    private renderMetrics(startX: number, startY: number, labelColor: string, valueColor: string): void {
        const metrics = this.world.getPlayer().getComponent('metrics') as MetricsComponent;
        if (!metrics) return;

        const metricsData = [
            { label: 'Tiles Traveled', value: metrics.tilesTraveled },
            { label: 'Times Crashed', value: metrics.timesCrashed },
            { label: 'Objectives Secured', value: metrics.objectivesSecured },
            { label: 'Tiles Drifted', value: metrics.tilesDrifted }
        ];

        metricsData.forEach((metric, index) => {
            this.display.createString(
                startX,
                startY + (index * 2),
                `{${labelColor}}${metric.label}:{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.5 + (index * 0.3)
                    }
                }
            );

            this.display.createString(
                startX + metric.label.length + 2,
                startY + (index * 2),
                `{${valueColor}}${metric.value}{/}`,
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

    public hide(): void {
        this.display.getDisplayCanvas().style.display = 'none';
        this.titleBackground.style.display = 'none';
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}
} 