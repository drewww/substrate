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
import { CityBlockGeneratorOptions } from '../game/generators/city-block-generator';

export enum TitleMode {
    TITLE,
    DEATH,
    VICTORY,
    CREDITS,
    TUTORIAL,
    INSTRUCTIONS,
    DIFFICULTY,
    TRUE_VICTORY
}


export type CitySize = 'small' | 'medium' | 'large';
export type GameMode = 'helicopter-on' | 'helicopter-off';

export class TitleRenderer implements Renderer {
    getDifficultySettings(): CityBlockGeneratorOptions {
        // Convert map size to actual dimensions and set layout type
        let width: number, height: number, layoutType: 'generate' | 'fixed', objectiveCount: number;
        
        switch (this.difficultySettings.mapSize) {
            case 'small':
                width = 4;  // Even smaller for fixed layout
                height = 4;
                layoutType = 'fixed';  // Use fixed layout for small maps
                objectiveCount = 3;    // Fewer objectives for small maps
                break;
            case 'medium':
                width = 8;
                height = 8;
                layoutType = 'generate';
                objectiveCount = 7;    // Medium number of objectives
                break;
            case 'large':
                width = 10;
                height = 10;
                layoutType = 'generate';
                objectiveCount = 4;    // More objectives for large maps
                break;
            default:
                width = 10;
                height = 10;
                layoutType = 'generate';
                objectiveCount = 5;    // Default to medium
        }
        
        // Set trueEnd flag if helicopter is enabled and map size is large
        const trueEnd = this.difficultySettings.helicopter && this.difficultySettings.mapSize === 'large';
        
        // const trueEnd = true;

        // Return a complete object with all required properties
        return {
            layoutType: layoutType,
            width: width,
            height: height,
            objectiveCount: objectiveCount,
            spawnHelicopter: this.difficultySettings.helicopter,
            trueEnd: trueEnd,
            spawnProbabilities: {
                pedestrian: this.difficultySettings.mapSize === 'small' ? 0.5 :
                           this.difficultySettings.mapSize === 'medium' ? 0.4 : 0.4,
                camera: this.difficultySettings.mapSize === 'small' ? 0.4 :
                        this.difficultySettings.mapSize === 'medium' ? 0.6 : 0.8,
                boomer: this.difficultySettings.mapSize === 'small' ? 0.1 :
                        this.difficultySettings.mapSize === 'medium' ? 0.3 : 0.3,
                turret: this.difficultySettings.mapSize === 'small' ? 0.0 :
                        this.difficultySettings.mapSize === 'medium' ? 0.0 : 0.0
            },

            size: this.difficultySettings.mapSize as 'small' | 'medium' | 'large'
        };
    }
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
            "  {#FFFFFF,#FF194D} 🜛 {/} {w}COPTER{/} - shoots you if close",
            "  {#FFFFFF,#FF194D} ⏚ {/} {w}CAMERA{/} - calls the copter",
            "  {#FFFFFF,#FF194D} 🜻 {/} {w}BOOMER{/} - blocks your path",
            "",

            "",
            "WARNINGS",
            "  {#FFFFFF,#FF194D}LOCKED{/} - Seen by an enemy",
            "  {#0088FF}TURBO{/} - Available / Engaged",
            "  {#F76505}BRAKE{/} - Slowing down",
            "  {#FFC505}STUN{/} - Can't move",
            "",
            
        ]
    };
    currentMode: TitleMode = TitleMode.TITLE;
    objectiveIndex: number = 0;
    isInDashboardTutorial: boolean = false;

    private difficultySettings = {
        mapSize: 'medium', // 'small', 'medium', 'large'
        helicopter: true,  // true/false
    };

    constructor(
        private readonly display: Display,
        private readonly world: World,
        private readonly game: RuntimeGame
    ) {
        // Get all background images
        this.titleBackgrounds = {
            title: document.getElementById('title-background-title') as HTMLImageElement,
            death: document.getElementById('title-background-death') as HTMLImageElement,
            victory: document.getElementById('title-background-victory') as HTMLImageElement,
            trueVictory: document.getElementById('title-background-true-victory') as HTMLImageElement,
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
            case TitleMode.TRUE_VICTORY:
                this.titleBackgrounds.trueVictory.style.display = 'block';
                break;
            case TitleMode.VICTORY:
            case TitleMode.CREDITS:
            case TitleMode.INSTRUCTIONS:
                this.titleBackgrounds.victory.style.display = 'block';
                break;

            case TitleMode.DIFFICULTY:
                this.titleBackgrounds.title.style.display = 'none';
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
            case TitleMode.TRUE_VICTORY:
                setTimeout(() => {
                    this.renderTrueVictoryScreen();
                }, 1500);
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
            this.display.getViewportWidth() - 32,
            this.display.getViewportWidth() - 4,
            2,
            this.display.getViewportHeight() - 2
        );

        this.display.createString(this.display.getViewportWidth() - 30, 3, '{#999999}RUNNER/{/}{#w}GRIDLOCK{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
        });

        const menuItems = [
            '{#FF6D6D}r{/}un',
            '',
            '{#FF6D6D}t{/}utorial',
            '{#FF6D6D}p{/}ractice',
            '{#FF6D6D}i{/}nstructions',
            '',
            '{#FF6D6D}c{/}redits'
        ];

        menuItems.forEach((item, index) => {
            this.display.createString(this.display.getViewportWidth() - 28, 5 + index, item, 1000, {
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        });
    }

    private renderDeathScreen(): void {
        this.createDarkBackground(4, 32, 2, this.display.getViewportHeight() - 2);

        this.display.createString(2, 1, '{w}GAME OVER{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        this.renderMetrics(3, 3, '#999999', '#FF4444', false);
        
        // Add "B to go back" instruction at the bottom
        this.display.createString(35, this.display.getViewportHeight() - 1, '{#666666}Press [b] to go back{/}', 1000, {
            backgroundColor: '#00000000'
        });
    }

    private renderVictoryScreen(): void {
        this.createDarkBackground(
            this.display.getViewportWidth() - 39,
            this.display.getViewportWidth() - 2,
            1,
            this.display.getViewportHeight() - 1
        );

        const rightX = this.display.getViewportWidth() - 39;
        
        this.display.createString(rightX+1, 1, '{#55CE4A}MISSION COMPLETE{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        this.renderMetrics(rightX+2, 3, '#FFFFFF', '#55CE4A');
        
        // Add "B to go back" instruction at the bottom
        this.display.createString(rightX+2, this.display.getViewportHeight() - 2, '{#666666}Press [b] to go back{/}', 1000, {
            backgroundColor: '#00000000'
        });
    }

    private renderTrueVictoryScreen(): void {

        this.createDarkBackground(
            2,
            34,
            1,
            this.display.getViewportHeight() - 2
        );

        const rightX = 2;
        
        // Display "TRUE VICTORY" instead of "MISSION COMPLETE"
        this.display.createString(rightX+1, 2, '{#55CE4A}TRUE VICTORY{/}', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });
        
        // Add "OPERATOR ESCAPES" subtitle
        this.display.createString(rightX+1, 3, '{#ffffff}OPERATOR ESCAPES{/}', 1000, {
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.3
            }
        });

        // Render metrics starting 2 rows lower to accommodate the subtitle
        this.renderMetrics(rightX+2, 5, '#FFFFFF', '#55CE4A');
        
        // Add "B to go back" instruction at the bottom
        this.display.createString(rightX+2, this.display.getViewportHeight() - 4, '{#666666}Press [b] to go back{/}', 1000, {
            backgroundColor: '#00000000'
        });
    }

    private renderCreditsScreen(): void {
        const leftX = this.display.getViewportWidth() - 40;
        const rightX = this.display.getViewportWidth() - 4;

        this.createDarkBackground(
            leftX,
            rightX,
            1,
            this.display.getViewportHeight() - 2
        );
        
        this.display.createString(leftX + 2, 2, '{#999999}RUNNER/{/}{w}GRIDLOCK{/} BY', 1000, {
            fontWeight: 'bold',
            backgroundColor: '#00000000',
            animate: {
                delayBetweenChars: 0.05,
                initialDelay: 0.1
            }
        });

        let currentY = 4;
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

            currentY += credit.roles.length;
        });
        
        // Add "B to go back" instruction at the bottom
        this.display.createString(
            leftX + 2,
            this.display.getViewportHeight() - 4,
            '{#666666}Press [b] to go back{/}',
            1000,
            { backgroundColor: '#00000000' }
        );
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
                this.display.createString(19, this.display.getViewportHeight() - 2,
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

                this.display.createString(19, this.display.getViewportHeight() - 4,
                '{w}Slide past objective vehicles to steal their DATA CORES.{/}', 1000, {
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
                this.display.createString(3, this.display.getViewportHeight() - 4,
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

                this.display.createString(10, 7, '{w}Press B to continue.{/}', 1000, {
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

                this.display.createString(8, 12, 'Walls are hard, try to avoid them.', 1000, {
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

                this.display.createString(20, 11, 'Punch it.', 1000, {
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
        const rightX = Math.floor(this.display.getViewportWidth() / 2) - 2;
        const startY = 3;

        // Title
        this.display.createString(leftX, 2, '{#999999}RUNNER/{/}{#w}GRIDLOCK{/}', 1000, {
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
            rightX+2,
            this.display.getViewportHeight() - 3,
            '{#666666}Press [b] to return{/}',
            1000,
            { backgroundColor: '#00000000' }
        );
    }

    private blankScreen(): void {
        this.display.clear();

        for(let y = 0; y < this.display.getViewportHeight()-2; y++) {
            for(let x = 0; x < this.display.getViewportWidth(); x++) {
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

    private createDarkBackground(startX: number, endX: number, startY: number, endY: number, color?: string): void {
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                this.display.createTile(x, y, ' ', '#FFFFFF00', color ?? '#000000cc', 1000);
            }
        }
    }
    
    public getCurrentMode(): TitleMode {
        return this.currentMode;
    }

    private renderMetrics(startX: number, startY: number, labelColor: string, valueColor: string, showBest: boolean = true): void {
        const metrics = this.world.getPlayer().getComponent('metrics') as MetricsComponent;
        if (!metrics) return;

        // Get the current game configuration
        const citySize: CitySize = this.game.currentDifficultySettings?.size || 'medium';
        const helicopterMode: GameMode = this.game.currentDifficultySettings?.spawnHelicopter ? 'helicopter-on' : 'helicopter-off';
        
        // Get best metrics for comparison (but don't save them yet)
        const bestMetrics = MetricsComponent.getBestMetrics(citySize, helicopterMode);
        
        logger.warn('Current metrics:', metrics);
        logger.warn('Best metrics:', bestMetrics);

        // Format time in minutes:seconds with proper error handling
        const formatTime = (timeInSeconds: number): string => {
            if (isNaN(timeInSeconds) || timeInSeconds < 0) return "0:00";
            const minutes = Math.floor(timeInSeconds / 60);
            const seconds = Math.floor(timeInSeconds % 60);
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };

        // Calculate tiles between crashes (average)
        const tilesBetweenCrashes = metrics.timesCrashed > 0 
            ? Math.round(metrics.tilesTraveled / metrics.timesCrashed) 
            : metrics.tilesTraveled; // If no crashes, use total tiles
        
        // Calculate total time safely
        let totalTimeSeconds = 0;
        if (metrics.timeStarted > 0) {
            const endTime = metrics.timeEnded > 0 ? metrics.timeEnded : performance.now();
            totalTimeSeconds = (endTime - metrics.timeStarted) / 1000;
        }

        // Define our metrics data with labels (without colons) and values
        const metricsData = [
            { 
                label: "Time", 
                value: formatTime(totalTimeSeconds),
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || (totalTimeSeconds > 0 && totalTimeSeconds < bestMetrics.duration),
                lowerIsBetter: true
            },
            { 
                label: "Objectives", 
                value: `${metrics.objectivesSecured}/${metrics.maxObjectivesThisLevel}`,
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || metrics.objectivesSecured > bestMetrics.objectivesSecured,
                lowerIsBetter: false
            },
            { 
                label: "Tiles Traveled", 
                value: metrics.tilesTraveled.toString(),
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || (metrics.tilesTraveled < bestMetrics.tilesTraveled && metrics.tilesTraveled > 0),
                lowerIsBetter: true
            },
            { 
                label: "Times Crashed", 
                value: metrics.timesCrashed.toString(),
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || metrics.timesCrashed < bestMetrics.timesCrashed,
                lowerIsBetter: true
            },
            { 
                label: "Crashless Streak", 
                value: tilesBetweenCrashes.toString(),
                isBest: !bestMetrics || tilesBetweenCrashes > bestMetrics.bestTilesBetweenCrashes,
                lowerIsBetter: false
            },
            { 
                label: "Turbo Tiles", 
                value: metrics.turboTilesTraveled.toString(),
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || metrics.turboTilesTraveled > bestMetrics.turboTilesTraveled,
                lowerIsBetter: false
            },
            { 
                label: "Tiles Drifted", 
                value: metrics.tilesDrifted.toString(),
                // If no best metrics exist, or current is better, mark as best
                isBest: !bestMetrics || metrics.tilesDrifted > bestMetrics.tilesDrifted,
                lowerIsBetter: false
            }
        ];

        // Find the longest label to align everything properly
        const labelColumnWidth = Math.max(...metricsData.map(item => item.label.length)) + 2; // +2 for spacing
        const valueX = startX + labelColumnWidth; // Position where values start
        const bestLabelX = valueX + 6; // Position where "BEST" labels start
        const bestLabelColor = '#FFCC00'; // Yellow color for "BEST" labels
        
        // Render each metric
        let currentY = startY;
        const createdTileIds: string[] = [];
        
        metricsData.forEach(item => {
            // Calculate the starting position for the label to right-align it
            const labelStartX = valueX - item.label.length - 2; // -2 for spacing
            
            // Render the label (right-aligned)
            const labelTileIds = this.display.createString(
                labelStartX, 
                currentY, 
                item.label, 
                1000, 
                { backgroundColor: 'transparent' }
            );
            createdTileIds.push(...labelTileIds);
            
            // Render the value (left-aligned at the consistent valueX position)
            const valueTileIds = this.display.createString(
                valueX, 
                currentY, 
                item.value, 
                1000, 
                { backgroundColor: 'transparent' }
            );
            createdTileIds.push(...valueTileIds);
            
            // If this is a best metric, add the "BEST" label
            if (item.isBest && showBest) {
                const bestTileIds = this.display.createString(
                    bestLabelX, 
                    currentY, 
                    "BEST", 
                    1000, 
                    { backgroundColor: 'transparent' }
                );
                
                // Update the color of the "BEST" label tiles
                bestTileIds.forEach(tileId => {
                    this.display.updateTile(tileId, {
                        fg: bestLabelColor
                    });
                });
                
                createdTileIds.push(...bestTileIds);
            }
            
            currentY++;
        });
        
        // Update the colors of all created tiles (except "BEST" labels which were already colored)
        createdTileIds.forEach(tileId => {
            const tile = this.display.getTile(tileId);
            if (tile) {
                // Check if this is a label or value tile (not a "BEST" label)
                const isLabel = metricsData.some(item => 
                    tile.x < valueX && tile.y >= startY && tile.y < startY + metricsData.length
                );
                
                // Only update if it's not already a "BEST" label
                if (tile.color !== bestLabelColor) {
                    this.display.updateTile(tileId, {
                        fg: isLabel ? labelColor : valueColor
                    });
                }
            }
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

            this.display.createString(6, this.display.getViewportHeight() - 4, '{w}Go fast to enable turbo. [space]{/}', 1000, {
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
            '{w}Turbo drains your energy. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });

        } else if(this.spaceCount === 3) {
            this.display.createString(10, this.display.getViewportHeight() - 4,
            '{w}Stay too long in a {#FF194D}spotlight{/} and you die. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });
        } else if(this.spaceCount === 4) {
            this.display.createString(4, this.display.getViewportHeight() - 4,
            '{w}Fill objective meter to unlock an exit. [space]{/}', 1000, {
                backgroundColor: '#000000',
                animate: {
                    delayBetweenChars: 0.05,
                    initialDelay: 0.0
                }
            });

            // this.display.createTile(50, this.display.getViewportHeight() - 4, '⤵', '#FFFFFFFF', '#00000000', 1000, {
            //     offsetSymbolX: -0.1
            // });

        } else if(this.spaceCount === 5) {

            // this.display.createTile(80, this.display.getViewportHeight() - 4, '⤵', '#FFFFFFFF', '#00000000', 1000);

            this.display.createString(38, this.display.getViewportHeight() - 4,
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

            this.display.createString(19, this.display.getViewportHeight()-4,
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
        this.createDarkBackground(0, width+1, 0, height, "#000000");
        
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
        
        // City size section
        this.display.createString(
            4,
            5,
            "{w}CITY SIZE{/}",
            10000,
        );
        
        // Map size options with visual toggles
        const smallColor = this.difficultySettings.mapSize === 'small' ? "{#ffffff, #FF194D}" : "{w}";
        const mediumColor = this.difficultySettings.mapSize === 'medium' ? "{#ffffff, #FF194D}" : "{w}";
        const largeColor = this.difficultySettings.mapSize === 'large' ? "{#ffffff, #FF194D}" : "{w}";
        
        this.display.createString(
            5,
            7,
            `${smallColor}1 - small{/}`,
            10000
        );
        
        this.display.createString(
            5,
            8,
            `${mediumColor}2 - medium{/}`,
            10000
        );
        
        this.display.createString(
            5,
            9,
            `${largeColor}3 - large{/}`,
            10000
        );
        
        // Challenges section
        this.display.createString(
            4,
            11,
            "{w}CHALLENGE{/}",
            10000,
            { fontWeight: 'bold' }
        );
        
        // Helicopter toggle
        const helicopterColor = this.difficultySettings.helicopter ? "{#ffffff, #FF194D}" : "{w}";
        const helicopterStatus = this.difficultySettings.helicopter ? "ON" : "OFF";
        
        this.display.createString(
            5,
            13,
            `${helicopterColor}h - helicopter ${helicopterStatus}{/}`,
            10000
        );
        
        // Instructions at the bottom
        const instructionsY = height - 6;
        this.display.createString(
            5,
            instructionsY+1,
            "{w}Press R to run, B to go back{/}",
            10000
        );
        
        // Add a summary of selected options
        // this.display.createString(
        //     width - 25,
        //     7,
        //     "{w}SELECTED OPTIONS:{/}",
        //     10000
        // );
        
        // this.display.createString(
        //     width - 25,
        //     9,
        //     `City size: {y}${this.difficultySettings.mapSize}{/}`,
        //     10000
        // );
        
        // this.display.createString(
        //     width - 25,
        //     10,
        //     `Helicopter: {y}${this.difficultySettings.helicopter ? "ON" : "OFF"}{/}`,
        //     10000
        // );
    }

    public handleDifficultyKeyUp(action: string): void {
        if (this.currentMode !== TitleMode.DIFFICULTY) {
            return;
        }

        logger.warn(` IN TITLE RENDERER action: ${action}`);
        
        switch (action) {
            case 'small':
                // Set map size to small
                this.difficultySettings.mapSize = 'small';
                this.renderDifficultyScreen();
                break;
            case 'medium':
                // Set map size to medium
                this.difficultySettings.mapSize = 'medium';
                this.renderDifficultyScreen();
                break;
            case 'large':
                // Set map size to large
                this.difficultySettings.mapSize = 'large';
                this.renderDifficultyScreen();
                break;
            case 'helicopter':
                // Toggle helicopter
                this.difficultySettings.helicopter = !this.difficultySettings.helicopter;
                this.renderDifficultyScreen();
                break;
            case 'b':
                // Go back to title screen
                this.show(TitleMode.TITLE);
                break;
        }
    }
} 