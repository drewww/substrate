import { Display } from '../display/display';
import { Renderer } from './renderer';
import { Entity } from '../entity/entity';
import { Component } from '../entity/component';
import { Point } from '../types';
import { MetricsComponent } from '../game/components/metrics.component';
import { World } from '../world/world';
import { logger } from '../util/logger';
import { FacingComponent } from '../entity/components/facing-component';
import { ObjectiveComponent } from '../game/components/objective.component';
import { LightEmitterComponent } from '../entity/components/light-emitter-component';
import { RuntimeGame } from '../game/runtime-game';
import { SymbolComponent } from '../entity/components/symbol-component';
import { OpacityComponent } from '../entity/components/opacity-component';
import { ImpassableComponent } from '../entity/components/impassable-component';
import { VehicleLeaderComponent } from '../game/components/vehicle-leader.component';
import { FollowableComponent } from '../entity/components/followable-component';
import { CooldownComponent } from '../game/components/cooldown.component';
import { FollowerComponent } from '../entity/components/follower-component';

export enum TitleMode {
    TITLE,
    DEATH,
    VICTORY,
    CREDITS,
    TUTORIAL,
    INSTRUCTIONS,
    DIFFICULTY
}

export class TitleRenderer implements Renderer {
    private titleBackgrounds: {[key: string]: HTMLImageElement} = {};

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
    private readonly INSTRUCTIONS = {
        leftColumn: [
            "MOVEMENT",
            " ",
            "   W ",
            "  ASD   tap to move slowly",
            " ",
            "   {#000000,#FFFFFF}W{/} ",
            "  {#000000,#FFFFFF}ASD{/}   hold to accelerate",
            " ",
            "  {#000000,#FFFFFF}SHIFT{/} - hold for turbo",
            "  {#000000,#FFFFFF}SPACE{/} - hold to brake",
            "",
            "OBJECTIVES",
            "  {#F7BADF}⧯{/} {w}Steal DATA CORES{/}",
            "  {#eeeeee}⬚{/} {w}Find EXTRACTION point{/}",
            "  {#FF194D}●{/} {w}Avoid SECOPS spotlights{/}",
            ""
        ],
        rightColumn: [
            "ENEMIES",
            "  {#FFFFFF,#FF194D} 🜛 {/} {w}COPTER{/} - tracks and destroys you",
            "  {#FFFFFF,#FF194D} ⏚ {/} {w}CAMERA{/} - calls the copter",
            "  {#FFFFFF,#FF194D} ⛣ {/} {w}TURRET{/} - shoots caltrops that slow you down",
            "  {#FFFFFF,#FF194D} 🜻 {/} {w}BOOMER{/} - explodes into impassable terrain",
            "",

            "",
            "WARNINGS",
            "  {#FFFFFF,#FF194D}LOCKED{/} - An enemy can see you, and the COPTER is coming.",
            "  {#0088FF}TURBO{/} - Available / Engaged",
            "  {#F76505}BRAKE{/} - Slowing down",
            "  {#FFC505}STUN{/} - Time to recover from a crash.",
            "",
            "TIPS",
            "  - Start with the tutorial, then practice to get used to movement."
            
        ]
    };
    currentMode: TitleMode = TitleMode.TITLE;
    objectiveIndex: number = 0;
    isInDashboardTutorial: boolean = false;

    constructor(
        private readonly display: Display,
        private readonly world: World,
        private readonly game: RuntimeGame
    ) {
        // Get all background images
        this.titleBackgrounds = {
            title: document.getElementById('title-background-title') as HTMLImageElement,
            death: document.getElementById('title-background-death') as HTMLImageElement,
            victory: document.getElementById('title-background-victory') as HTMLImageElement
        };

        if (!this.titleBackgrounds.title || !this.titleBackgrounds.death || !this.titleBackgrounds.victory) {
            throw new Error('Title background images not found');
        }
        this.world = world;
        this.game = game;
    }

    public prepare(mode: TitleMode): void {
        // Hide all backgrounds first
        Object.values(this.titleBackgrounds).forEach(img => {
            img.style.display = 'none';
        });

        // Show the appropriate background
        switch(mode) {
            case TitleMode.TITLE:
                this.titleBackgrounds.title.style.display = 'block';
                break;
            case TitleMode.DEATH:
                this.titleBackgrounds.death.style.display = 'block';
                break;
            case TitleMode.VICTORY:
            case TitleMode.CREDITS:
            case TitleMode.INSTRUCTIONS:
            case TitleMode.DIFFICULTY:
                this.titleBackgrounds.victory.style.display = 'block';
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
            case TitleMode.INSTRUCTIONS:
                this.renderInstructionsScreen();
                break;
            case TitleMode.DIFFICULTY:
                this.renderDifficultyScreen();
                break;
        }

        if (mode !== TitleMode.TUTORIAL) {
            this.titleBackgrounds.title.style.display = 'block';
            this.titleBackgrounds.title.style.visibility = 'visible';
        } else {
            this.titleBackgrounds.title.style.display = 'none';
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
            '{w}[i]nstructions{/}',
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

            if(this.objectiveIndex === 5) {
                this.game.stopEngine();
                this.game.showUISpeedBar();

                this.blankScreen();

                this.display.createString(10, this.display.getViewportHeight() - 4, '{w}Pay attention to your dashboard.   [space]{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });

                this.game.getUISpeedRenderer().lightUpDashboard();
                this.isInDashboardTutorial = true;
            } 

            if(this.objectiveIndex === 8) {
                this.display.clear();
                this.display.createString(19, this.display.getViewportHeight() - 14,
                '{w}Hold SPACE to brake.{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });
    
            }

            if(this.objectiveIndex === 10) {
                this.display.clear();

                this.display.createString(19, this.display.getViewportHeight() - 14,
                '{w}Collide with vehicles to steal their DATA CORES.{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });
    
                // Create vehicle segments
                const leader = new Entity({x: 27, y: 11});
                leader.setComponent(new SymbolComponent('⧯', '#E87DBEFF', '#00000000', 20));
                leader.setComponent(new FacingComponent(1));
                leader.setComponent(new OpacityComponent());
                leader.setComponent(new ImpassableComponent());
                leader.setComponent(new ObjectiveComponent(true, true, 'vehicle', 9));
                leader.setComponent(new VehicleLeaderComponent());
                leader.setComponent(new FollowableComponent());


                const body = new Entity({x: 26, y: 11});
                body.setComponent(new SymbolComponent('⧯', '#E87DBEFF', '#00000000', 20));
                body.setComponent(new FacingComponent(1));
                body.setComponent(new OpacityComponent());
                body.setComponent(new ImpassableComponent());
                body.setComponent(new ObjectiveComponent(true, true, 'vehicle', 9));
                body.setComponent(new FollowerComponent());
                body.setComponent(new FollowableComponent());

                const trailer = new Entity({x: 25, y: 11});
                trailer.setComponent(new SymbolComponent('⧯', '#E87DBEFF', '#00000000', 20));
                trailer.setComponent(new FacingComponent(1));
                trailer.setComponent(new OpacityComponent());
                trailer.setComponent(new ImpassableComponent());
                trailer.setComponent(new ObjectiveComponent(true, true, 'vehicle', 9));
                trailer.setComponent(new FollowerComponent());

                // now add the lightEmitters to them. 
                const lightEmitter = new LightEmitterComponent({
                    "radius": 3,
                    "color": "#55CE4A",
                    "intensity": 0.6,
                    "distanceFalloff": "linear",
                    "lightSourceTile": false
                });

                leader.setComponent(lightEmitter.clone());
                body.setComponent(lightEmitter.clone());
                trailer.setComponent(lightEmitter.clone());
                leader.setComponent(lightEmitter.clone());
                body.setComponent(lightEmitter.clone());
                trailer.setComponent(lightEmitter.clone());

                // Add to world
                this.world.addEntity(leader);
                this.world.addEntity(body); 
                this.world.addEntity(trailer);
            }


            if(this.objectiveIndex === 11) {
                this.display.clear();
                this.display.createString(19, this.display.getViewportHeight() - 14,
                '{w}Make it to an extraction point to complete the mission.{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });
    

                // now turn on the "exits" to complete the mission.
                // const exit = new Entity({x: 33, y: 10});
                // exit.setComponent(new SymbolComponent('⬚', '#eeeeeeff', '#00000000', 100));
                // exit.setComponent(new ObjectiveComponent(true, true, 'end', 11));

                // const lightEmitter = new LightEmitterComponent({
                //     "radius": 3,
                //     "color": "#55CE4A",
                //     "intensity": 0.6,
                //     "distanceFalloff": "linear",
                //     "lightSourceTile": false
                // });

                // exit.setComponent(lightEmitter);
                // exit.setComponent(lightEmitter);

                // this.world.addEntity(exit);

                // const exit2 = exit.clone()
                // exit2.setPosition(33, 11);
                // this.world.addEntity(exit2);

                // const exit3 = exit.clone()
                // exit3.setPosition(33, 12);
                // this.world.addEntity(exit3);
                
                // const exit4 = exit.clone()
                // exit4.setPosition(33, 13);
                // this.world.addEntity(exit4);                
            } 

            if(this.objectiveIndex === 12) {
                // game is over.                 
                this.display.clear();
                this.game.stopEngine();

                const player = this.world.getPlayer();
                this.invertDarkBackground(player.getPosition().x, player.getPosition().x + 1, player.getPosition().y, player.getPosition().y + 1);

                this.display.createString(10, 5, '{w}TUTORIAL COMPLETE{/}', 1000, {
                    backgroundColor: '#000000',
                });

                this.display.createString(10, 7, '{w}Press [q] to continue.{/}', 1000, {
                    backgroundColor: '#000000',
                });
            }
            
            logger.warn("objectiveIndex: " + this.objectiveIndex);
        });

        this.world.on('entityMoved', (data: { entity: Entity, from: Point, to: Point }) => {
            if(!data.entity.hasComponent('player')) return;
            if(data.to.x === 2 && data.to.y === 5) {
                this.display.clear();
                this.invertDarkBackground(2, 8, 4, 15);

                this.display.createString(10, 5, '{w}  W{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });
        
                this.display.createString(10, 6, '{w}A S D     Hold to accelerate.{/}', 1000, {
                    backgroundColor: '#000000',
                    animate: {
                        delayBetweenChars: 0.05,
                        initialDelay: 0.0
                    }
                });  
            }

            // if(data.to.x === 2 && data.to.y === 9) {
            //     this.display.clear();
            //     this.invertDarkBackground(2, 8, 4, 15);
            // }

            if(data.to.x === 2 && data.to.y === 12) {
                this.display.clear();
                this.invertDarkBackground(2, 8, 4, 15);

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

                this.display.createString(20, 11, 'Make haste.', 1000, {
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

    private renderInstructionsScreen(): void {
        // Create semi-transparent black background with 1 cell padding
        this.createDarkBackground(
            1,
            this.display.getViewportWidth() - 1,
            1,
            this.display.getViewportHeight() - 1
        );

        const leftX = 4;
        const rightX = Math.floor(this.display.getViewportWidth() / 2) - 17;
        const startY = 4;

        // Title
        this.display.createString(leftX, 2, '{#999999}RUNNER_2/{/}{#w}RUNTIME{/}', 1000, {
            fontWeight: 'bold',
        });

        // Render left column
        this.INSTRUCTIONS.leftColumn.forEach((line, index) => {
            this.display.createString(
                leftX,
                startY + index,
                `{#FFFFFF}${line}{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    // animate: {
                    //     delayBetweenChars: 0.05,
                    //     initialDelay: 0.1 + (index * 0.05)
                    // }
                }
            );
        });

        // Render right column
        this.INSTRUCTIONS.rightColumn.forEach((line, index) => {
            this.display.createString(
                rightX,
                startY + index,
                `{#FFFFFF}${line}{/}`,
                1000,
                {
                    backgroundColor: '#00000000',
                    // animate: {
                    //     delayBetweenChars: 0.05,
                    //     initialDelay: 0.1 + (index * 0.05)
                    // }
                }
            );
        });

        // Add return instruction at bottom
        this.display.createString(
            leftX,
            this.display.getViewportHeight() - 3,
            '{#666666}Press [q] to return{/}',
            1000,
            { backgroundColor: '#00000000' }
        );
    }

    private blankScreen(): void {
        this.display.clear();

        for(let y = 2; y < this.display.getViewportHeight()-4; y++) {
            for(let x = 2; x < this.display.getViewportWidth()-60; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', '#000000cc', 400);
            }
        }
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
        // Hide all backgrounds
        Object.values(this.titleBackgrounds).forEach(img => {
            img.style.display = 'none';
        });
    }

    private spaceCount: number = 0;
    public spacePressed() {

        if(!this.isInDashboardTutorial) { return; }

        this.spaceCount++;

        this.blankScreen();
            if(this.spaceCount === 1) {

                this.display.createTile(3, this.display.getViewportHeight() - 4, '⤷', '#FFFFFFFF', '#00000000', 1000, {
                    rotation: 90/180 * Math.PI
                }
                );

            this.display.createString(6, this.display.getViewportHeight() - 4, '{w}Your speed. At low speeds, you can turn. At high speeds you can ... [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        } else if(this.spaceCount === 2) {
            this.display.createTile(18, this.display.getViewportHeight() - 4, '⤷', '#FFFFFFFF', '#00000000', 1000, {
                rotation: 90/180 * Math.PI
            }
            );
            this.display.createString(20, this.display.getViewportHeight() - 4,
            '{w}... engage turbo. That will drain your energy. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });

        } else if(this.spaceCount === 3) {
            this.display.createString(10, this.display.getViewportHeight() - 4,
            '{w}You will be hunted. Staying too long in a SECOPS {r}spotlight{/} will destroy your RUNNER. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        } else if(this.spaceCount === 4) {
            this.display.createString(4, this.display.getViewportHeight() - 4,
            '{w}Fill this meter to unlock an exit. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });

            this.display.createTile(50, this.display.getViewportHeight() - 4, '⤵', '#FFFFFFFF', '#00000000', 1000, {
                offsetSymbolX: -0.1
            });

        } else if(this.spaceCount === 5) {

            this.display.createTile(80, this.display.getViewportHeight() - 4, '⤵', '#FFFFFFFF', '#00000000', 1000);

            this.display.createString(50, this.display.getViewportHeight() - 4,
            '{w}Watch your indicators. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        } else if(this.spaceCount === 6) {
            this.display.clear();
            this.game.getUISpeedRenderer().resetDashboard();
            this.game.startEngine();
            this.isInDashboardTutorial = false;

            this.selectObjective(5);

            this.display.createString(19, this.display.getViewportHeight() - 14,
            '{w}Hold SHIFT while moving at high speeds to TURBO.{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        }
    }

    update(timestamp: number): void {}
    handleEntityAdded(entity: Entity): void {}
    handleEntityModified(entity: Entity, componentType: string): void {}
    handleEntityMoved(entity: Entity, from: Point, to: Point): boolean { return true; }
    handleEntityRemoved(entity: Entity): void {}
    handleComponentModified(entity: Entity, componentType: string): void {}
    handleComponentRemoved(entity: Entity, componentType: string, component: Component): void {}

    private renderDifficultyScreen(): void {
        this.blankScreen();
        
        const width = this.display.getViewportWidth();
        const height = this.display.getViewportHeight();
        
        // Create dark background
        // this.createDarkBackground(2, 30, 2, height-2);
        
        // Title at the top
        const titleX = Math.floor(width / 2) - 6; // Center "PREPARE RUN" (11 characters)
        const titleY = Math.floor(height / 4);
        
        // Create the title text
        this.display.createString(
            4,
            3,
            "{w}PREPARE RUN{/}",
            10000,
            { fontWeight: 'bold' }
        );
        
        // Instructions at the bottom
        const instructionsY = height - 6;
        this.display.createString(
            5,
            instructionsY,
            "{w}Press R to run, B to go back{/}",
            10000
        );
    }
} 