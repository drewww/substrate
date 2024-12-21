import { Game } from '../game';
import { Display } from '../../display/display';
import { logger, LogLevel } from '../../display/util/logger';
import { EnemyEntity } from '../../entity/enemy';
import { Point } from '../../types';

let game: Game;
let display: Display;

function init() {
    const width = 40;
    const height = 30;
    
    // Initialize display
    const canvas = document.getElementById('display') as HTMLCanvasElement;
    display = new Display({
        elementId: canvas.id,
        cellWidth: 20,
        cellHeight: 20,
        worldWidth: width,
        worldHeight: height,
        viewportWidth: width,
        viewportHeight: height
    });

    // Initialize game
    game = new Game(display);
    
    // Add enemies
    spawnEnemies(10);
    
    // Set up debug displays
    setupDebugDisplays();
    
    // Set up controls
    setupControls();
    
    // Start game and debug updates
    game.start();
    setInterval(updateDebugDisplays, 1000/15); // Match game update frequency
}

function spawnEnemies(count: number) {
    for (let i = 0; i < count; i++) {
        const enemy = new EnemyEntity(getRandomPosition());
        enemy.setMoveReadyCallback(() => {
            const currentPos = enemy.getPosition();
            const newPos = getRandomAdjacentPosition(currentPos);
            try {
                game.getWorld().moveEntity(enemy.getId(), newPos);
            } catch (e) {
                // Handle collision/invalid move
            }
        });
        game.getWorld().addEntity(enemy);
    }
}

function getRandomAdjacentPosition(pos: Point): Point {
    const directions = [
        { x: 0, y: -1 },  // up
        { x: 1, y: 0 },   // right
        { x: 0, y: 1 },   // down
        { x: -1, y: 0 }   // left
    ];
    
    const direction = directions[Math.floor(Math.random() * directions.length)];
    return {
        x: Math.max(0, Math.min(40 - 1, pos.x + direction.x)),
        y: Math.max(0, Math.min(30 - 1, pos.y + direction.y))
    };
}

function getRandomPosition(): Point {
    return {
        x: Math.floor(Math.random() * 40),
        y: Math.floor(Math.random() * 30)
    };
}

function setupDebugDisplays() {
    const displayDebug = document.getElementById('display-debug')!;
    const worldDebug = document.getElementById('world-debug')!;

    // Initial visibility
    displayDebug.style.display = 'none';
    worldDebug.style.display = 'none';
}

function updateDebugDisplays() {
    const displayDebug = document.getElementById('display-debug')!;
    const worldDebug = document.getElementById('world-debug')!;

    if (displayDebug.style.display !== 'none') {
        displayDebug.textContent = display.getDebugString();
    }

    if (worldDebug.style.display !== 'none') {
        const world = game.getWorld();
        const stats = {
            entities: world.getEntities().length,
            spatialMap: Object.fromEntries(world.getSpatialMapStats()),
            eventHandlers: world.getEventHandlerCount()
        };
        worldDebug.textContent = JSON.stringify(stats, null, 2);
    }
}

function setupControls() {
    // Debug toggles
    document.getElementById('toggleDisplayDebug')?.addEventListener('click', () => {
        const debug = document.getElementById('display-debug')!;
        debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('toggleWorldDebug')?.addEventListener('click', () => {
        const debug = document.getElementById('world-debug')!;
        debug.style.display = debug.style.display === 'none' ? 'block' : 'none';
    });

    // Log level control
    document.getElementById('logLevel')?.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        logger.setLogLevel(parseInt(select.value) as LogLevel);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init); 