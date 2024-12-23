import { Game } from '../game';
import { Display } from '../../display/display';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { Engine } from '../../engine/engine';
import { EnemyMovementSystem } from './systems/enemy-movement.system';
import { EnemyEntity } from '../../entity/enemy';
import { TestGameRenderer } from './renderers/test-game-renderer';
import { Renderer } from '../../render/renderer';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { PlayerComponent } from '../../entity/components/player-component';
import { ActionHandler, MoveAction } from '../../action/action-handler';
import { ImpassableComponent } from '../../entity/components/impassable-component';

const DEFAULT_INPUT_CONFIG = `
mode: game
==========
map: default
---
w move up
s move down
a move left
d move right
`;

export class BasicTestGame extends Game {
    private enemyMovementSystem: EnemyMovementSystem;
    private actionHandler: ActionHandler;
    
    constructor(display: Display) {
        super(display);
        
        // Set up action handler
        this.actionHandler = new ActionHandler(this.world);
        this.actionHandler.registerAction('move', MoveAction);
        
        // Set up input configuration
        this.input.loadConfig(DEFAULT_INPUT_CONFIG);
        this.input.setMode('game');
        
        // Initialize our systems
        this.enemyMovementSystem = new EnemyMovementSystem(this.world, this.actionHandler);
        
        // Add system to engine update loop
        this.engine.addSystem(deltaTime => {
            this.enemyMovementSystem.update(deltaTime);
        });
    }

    protected createRenderer(): Renderer {
        return new TestGameRenderer(this.world, this.display);
    }

    protected initializeWorld(): void {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create and configure player
        this.player = new Entity({ x: Math.floor(width/2), y: Math.floor(height/2) });
        this.player.setComponent(new SymbolComponent(
            '@',            // Traditional roguelike player symbol
            '#FFD700',      // Gold color for player
            'transparent',  // Transparent background
            5              // Higher z-index to stay above most entities
        ));
        this.player.setComponent(new PlayerComponent());
        this.world.addEntity(this.player);

        // Initialize engine with our world
        this.engine = new Engine({
            mode: 'realtime',
            worldWidth: width,
            worldHeight: height,
            player: this.player,
            world: this.world
        });

        // Add enemies
        const enemyPositions = new Set<string>();
        for (let i = 0; i < 10; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const posKey = `${x},${y}`;
            
            // Don't place enemy if there's already one there or if it's the player position
            if (!enemyPositions.has(posKey) && 
                (x !== this.player.getPosition().x || y !== this.player.getPosition().y)) {
                enemyPositions.add(posKey);
                const enemy = new EnemyEntity({ x, y });
                enemy.setComponent(new ImpassableComponent());
                this.world.addEntity(enemy);
            }
        }

        // Add walls (impassable entities)
        const numWalls = Math.floor(width * height * 0.08); // 8% of the map
        for (let i = 0; i < numWalls; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const posKey = `${x},${y}`;

            // Don't place wall if there's already an entity there
            if (!enemyPositions.has(posKey) && 
                (x !== this.player.getPosition().x || y !== this.player.getPosition().y)) {
                const wall = new Entity({ x, y });
                wall.setComponent(new ImpassableComponent());
                wall.setComponent(new SymbolComponent(
                    '#',           // Wall symbol
                    '#aaaaaaff',   // Light gray foreground
                    '#ddddddff',   // Lighter gray background
                    1              // Low z-index to stay below other entities
                ));
                this.world.addEntity(wall);
                enemyPositions.add(posKey); // Prevent enemies from spawning here
            }
        }
    }

    protected handleInput(type: string, action: string, params: string[]): void {
        if (type === 'up') {
            return;
        }

        if (action === 'move') {
            const pos = this.player.getPosition();
            let newPos: Point = { ...pos };

            switch(params[0]) {
                case 'up':    newPos.y--; break;
                case 'down':  newPos.y++; break;
                case 'left':  newPos.x--; break;
                case 'right': newPos.x++; break;
            }

            this.actionHandler.execute({
                type: 'move',
                entityId: this.player.getId(),
                to: newPos
            });
        }
    }
} 