import { BasicTestGame } from './basic-test-game';
import { Display } from '../../display/display';
import { logger, LogLevel } from '../../util/logger';

let game: BasicTestGame;
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

    // Set black background
    display.setBackground(
        ' ',           // Empty character
        'transparent', // Transparent foreground
        '#000000FF'     // Black background
    );

    // Initialize game
    game = new BasicTestGame(display);
        
    // Set up debug displays
    setupDebugDisplays();
    
    // Set up controls
    setupControls();
    
    // Start game and debug updates
    game.start();
    setInterval(updateDebugDisplays, 1000/15); // Match game update frequency
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