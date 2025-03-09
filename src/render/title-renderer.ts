import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { MetricsComponent } from '../game/components/metrics.component';
import { World } from '../world/world';
import { logger } from '../util/logger';
import { ObjectiveComponent } from '../game/components/objective.component';
import { LightEmitterComponent } from '../entity/components/light-emitter-component';

export enum TitleMode {
    TITLE,
    DEATH,
    VICTORY,
    CREDITS,
    TUTORIAL
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
    objectiveIndex: number = 0;

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
            case TitleMode.TUTORIAL:
                this.renderTutorialScreen();
                break;
        }

        if (mode !== TitleMode.TUTORIAL) {
            this.titleBackground.style.display = 'block';
            this.titleBackground.style.visibility = 'visible';
        } else {
            this.titleBackground.style.display = 'none';
        }

        this.display.getDisplayCanvas().style.display = 'block';
        this.display.getDisplayCanvas().style.visibility = 'visible';

        this.currentMode = mode;
    }

    private renderTitleScreen(): void {
        this.createDarkBackground(
            this.display.getViewportWidth() - 35,
            this.display.getViewportWidth() - 4,
            2,
            this.display.getViewportHeight() - 2
        );

        this.display.createString(this.display.getViewportWidth() - 33, 3, '{#999999}RUNNER_2/{/}{#w}RUNTIME{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
        });

        const menuItems = [
            '{w}[r]un{/}',
            '',
            '{w}[t]utorial{/}',
            '{w}[p]ractice{/}',
            '',
            '{w}[c]redits{/}'
        ];

        menuItems.forEach((item, index) => {
            this.display.createString(this.display.getViewportWidth() - 31, 5 + index, item, 1000, {
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

    private renderTutorialScreen(): void {
        // this.createDarkBackground(5, 30, 5, 7);
        this.invertDarkBackground(4, 6, 2, 8);

        this.display.createString(10, 2, '{w}This is your RUNNER.{/}', 1000, {
            backgroundColor: '#000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        this.display.createString(10, 4, '{w}  W{/}', 1000, {
            backgroundColor: '#000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 1.0
            }
        });

        this.display.createString(10, 5, '{w}A S D     Tap to move.{/}', 1000, {
            backgroundColor: '#000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 1.0
            }
        });

        this.world.on('objective-complete', () => {
            this.selectObjective(this.objectiveIndex);
        });

        this.world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
            if(!data.entity.hasComponent('player')) return;
            if(data.to.x === 2 && data.to.y === 5) {
                this.display.clear();
                this.invertDarkBackground(4, 6, 4, 15);

                this.display.createString(10, 5, '{w}  W{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 1.0
                    }
                });
        
                this.display.createString(10, 6, '{w}A S D     Hold to accelerate.{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 1.0
                    }
                });  
            }

            if(data.to.x === 2 && data.to.y === 9) {
                this.display.clear();
                this.invertDarkBackground(4, 6, 6, 14);
            }

            if(data.to.x === 2 && data.to.y === 13) {
                this.display.clear();
                this.invertDarkBackground(4, 6, 10, 14);

                this.display.createString(8, 12, 'Don\'t crash. We don\'t have time for that.', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.5
                    }
                });
            }

            if(data.to.x === 3 && data.to.y === 13) {
                this.display.clear();
                // this.invertDarkBackground(4, 65, 8, 14);

                this.display.createString(10, 11, 'Make haste.', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });

                this.selectObjective(0);
            }
        });
    }

    private invertDarkBackground(startX: number, endX: number, startY: number, endY: number): void {
        // Fill top section
        for (let y = 0; y < startY; y++) {
            for (let x = 0; x < this.display.getViewportWidth(); x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 400);
            }
        }

        // Fill left and right sections
        for (let y = startY; y < endY; y++) {
            // Left section
            for (let x = 0; x < startX; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 400);
            }
            // Right section
            for (let x = endX; x < this.display.getViewportWidth(); x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 400);
            }
        }

        // Fill bottom section
        for (let y = endY; y < this.display.getViewportHeight(); y++) {
            for (let x = 0; x < this.display.getViewportWidth(); x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 1000);
            }
        }
    }

    private selectObjective(index: number): void {
        const entities = this.world.getEntitiesWithComponent('objective');

        const activeObjectiveEntities = entities.filter((objective) => (objective.getComponent('objective') as ObjectiveComponent).active);

        for(const entity of activeObjectiveEntities) {
            const objective = entity.getComponent('objective') as ObjectiveComponent;

            if(objective) {
                objective.active = false;
                entity.setComponent(objective);
                entity.removeComponent('lightEmitter');
            }
        }

        const nextObjectives = entities.filter((objective) => (objective.getComponent('objective') as ObjectiveComponent).index === index);

        for(const entity of nextObjectives) {
            const objective = entity.getComponent('objective') as ObjectiveComponent;
            objective.active = true;
            entity.setComponent(objective);
            const lightEmitter = new LightEmitterComponent({
                "radius": 3,
                "color": "#55CE4A",
                "intensity": 0.6,
                "distanceFalloff": "linear",
                "lightSourceTile": false
            });

            entity.setComponent(lightEmitter);
            entity.setComponent(lightEmitter);
        }

        this.objectiveIndex++;
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