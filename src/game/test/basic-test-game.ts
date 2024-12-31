import { Game } from '../game';
import { Entity } from '../../entity/entity';
import { Point } from '../../types';
import { Engine } from '../../engine/engine';
import { EnemyMovementSystem } from './systems/enemy-movement.system';
import { EnemyEntity } from '../../entity/enemy';
import { TestGameRenderer } from './renderers/test-game-renderer';
import { Renderer } from '../../render/renderer';
import { SymbolComponent } from '../../entity/components/symbol-component';
import { PlayerComponent } from '../../entity/components/player-component';
import { ActionHandler, BaseAction, ActionClass } from '../../action/action-handler';
import { ImpassableComponent } from '../../entity/components/impassable-component';
import { Display, Easing } from '../../display/display';
import { World } from '../../world/world';
import { BumpingComponent } from '../../entity/components/bumping-component';
import { logger } from '../../util/logger';
import { OpacityComponent } from '../../entity/components/opacity-component';

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
    
    constructor(canvasId: string) {
        super({
            elementId: canvasId,
            cellWidth: 20,
            cellHeight: 20,
            worldWidth: 120,
            worldHeight: 120,
            viewportWidth: 40,
            viewportHeight: 20
        });
        
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

        // Add cell inspection
        this.display.onCellClick((pos) => {
            // First show tile information
            const tiles = this.display.getTilesAt(pos.x, pos.y);
            if (tiles.length > 0) {
                logger.info(`Tiles at (${pos.x}, ${pos.y}):`);
                tiles.forEach(tile => {
                    logger.info(`- Symbol: "${tile.char}" | Color: ${tile.color} | Z-Index: ${tile.zIndex}`);
                });
            } else {
                logger.info(`No tiles at (${pos.x}, ${pos.y})`);
            }

            // Then show entity and component information
            const entities = this.world.getEntitiesAt(pos);
            if (entities.length > 0) {
                logger.info(`Entities at (${pos.x}, ${pos.y}):`);
                entities.forEach(entity => {
                    const components = entity.getComponents().map(c => c.type);
                    logger.info(`- Entity ${entity.getId()}: Components = [${components.join(', ')}]`);
                });
            }

            // Log the visibility mask
            const renderer = this.renderer as TestGameRenderer;
            const visibilityMask = renderer.getVisibilityMask?.();
            if (visibilityMask) {
                logger.info('Visibility:', visibilityMask[pos.y][pos.x]);
            }
        });
    }

    protected createRenderer(): Renderer {
        return new TestGameRenderer(this.display, this.world);
    }

    protected initializeWorld(): void {
        const width = this.display.getWorldWidth();
        const height = this.display.getWorldHeight();

        // Create and configure player
        this.player = new Entity({ x: Math.floor(width/2), y: Math.floor(height/2) });
        this.player.setComponent(new SymbolComponent(
            '@',            
            '#FFD700FF',     
            '#00000000',   // Explicitly use 8-digit hex for full transparency
            5              
        ));
        this.player.setComponent(new PlayerComponent());
        this.player.setComponent(new ImpassableComponent());
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
        for (let i = 0; i < 100; i++) {
            const x = Math.floor(Math.random() * width);
            const y = Math.floor(Math.random() * height);
            const posKey = `${x},${y}`;
            
            // Don't place enemy if there's already one there or if it's the player position
            if (!enemyPositions.has(posKey) && 
                (x !== this.player.getPosition().x || y !== this.player.getPosition().y)) {
                enemyPositions.add(posKey);
                const enemy = new EnemyEntity({ x, y });
                enemy.setComponent(new ImpassableComponent());
                enemy.setComponent(new SymbolComponent(
                    'E',
                    '#FFFFFFFF',
                    '#00000000',  // Explicitly use 8-digit hex for full transparency
                    2
                ));
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

        // Add opacity to walls
        const wall = this.world.getEntitiesWithComponent('impassable')[0];
        wall.setComponent(new OpacityComponent(true));

        // After adding all entities, update initial visibility
        (this.renderer as TestGameRenderer).updateVisibility();

        // Center viewport on player after world is initialized
        this.updateViewport(false);
    }

    private updateViewport(animate: boolean = true): void {
        const pos = this.player.getPosition();
        const viewportWidth = this.display.getViewportWidth();
        const viewportHeight = this.display.getViewportHeight();
        
        // Center the viewport on the player
        const viewportX = Math.max(0, Math.min(
            pos.x - Math.floor(viewportWidth / 2),
            this.world.getWorldWidth() - viewportWidth
        ));
        const viewportY = Math.max(0, Math.min(
            pos.y - Math.floor(viewportHeight / 2),
            this.world.getWorldHeight() - viewportHeight
        ));

        this.display.setViewport(Math.floor(viewportX), Math.floor(viewportY), {
            smooth: animate,
            duration: 0.1,  // 100ms transition
            easing: Easing.quadOut
        });
        // this.display.setViewport(viewportX, viewportY);
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
                data: { to: newPos }
            });

            // Update viewport to follow player
            this.updateViewport();
        }
    }
    
    public getDisplay(): Display {
        return this.display;
    }

    public saveGame(): void {
        const saveData = {
            world: this.world.serialize()
        };

        localStorage.setItem('gameState', JSON.stringify(saveData));
        console.log('Game saved');
    }

    public loadGame(): void {
        const savedState = localStorage.getItem('gameState');
        if (!savedState) {
            console.log('No saved game found');
            return;
        }

        try {
            const saveData = JSON.parse(savedState);
            const newWorld = World.deserialize(saveData.world);
            
            // Replace current world
            this.world = newWorld;
            
            // Re-establish player reference
            this.player = this.world.getEntitiesWithComponent('player')[0];
            
            // Update viewport to center on player
            this.updateViewport(false);
            
            console.log('Game loaded');
        } catch (error) {
            console.error('Error loading game:', error);
        }
    }
} 


// Example action implementations

// Example action types
interface MoveActionData {
    to: Point;
}

export const MoveAction: ActionClass<MoveActionData> = {
    canExecute(world: World, action: BaseAction<MoveActionData>): boolean {
        const entity = world.getEntity(action.entityId);
        if (!entity) return false;

        const { x, y } = action.data.to;
        const size = world.getSize();
        if (x < 0 || x >= size.x || y < 0 || y >= size.y) {
            return false;
        }

        // Check for impassable entities at the destination
        const entitiesAtDest = world.getEntitiesAt(action.data.to);
        const hasImpassable = entitiesAtDest.some(e => e.hasComponent('impassable'));
        
        if (hasImpassable) {
            const from = entity.getPosition();
            const direction = {
                x: action.data.to.x - from.x,
                y: action.data.to.y - from.y
            };
            entity.setComponent(new BumpingComponent(direction));
            return false;
        }

        return !hasImpassable;
    },

    execute(world: World, action: BaseAction<MoveActionData>): boolean {
        return world.moveEntity(action.entityId, action.data.to);
    }
};
