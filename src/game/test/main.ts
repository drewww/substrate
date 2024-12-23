import { BasicTestGame } from './basic-test-game';
import { logger, LogLevel } from '../../util/logger';
import { DebugOverlay } from '../../display/test/debug-overlay';
import { WorldDebugOverlay } from '../../world/debug-overlay';

let game: BasicTestGame;
let displayDebug: DebugOverlay;
let worldDebug: WorldDebugOverlay;
let engineDebugElement: HTMLDivElement;

function init() {
    // Initialize game
    const canvas = document.getElementById('display') as HTMLCanvasElement;
    game = new BasicTestGame(canvas.id);
    
    // Set up debug overlays
    const displayDebugElement = document.getElementById('display-debug')!;
    const worldDebugElement = document.getElementById('world-debug')!;
    engineDebugElement = document.getElementById('engine-debug') as HTMLDivElement;
    
    displayDebug = new DebugOverlay(game.getDisplay(), displayDebugElement);
    worldDebug = new WorldDebugOverlay(game.getWorld(), worldDebugElement);
    
    // Set up engine debug updates
    setInterval(updateEngineDebug, 1000/15); // 15fps updates
    
    // Set up controls
    setupControls();
    
    // Start game
    game.start();
}

function updateEngineDebug() {
    if (engineDebugElement.style.display !== 'none') {
        engineDebugElement.textContent = game.getEngine().getDebugString();
    }
}

function setupControls() {
    // Debug toggles
    document.getElementById('toggleDisplayDebug')?.addEventListener('click', () => {
        displayDebug.toggle();
    });

    document.getElementById('toggleWorldDebug')?.addEventListener('click', () => {
        worldDebug.toggle();
    });

    document.getElementById('toggleEngineDebug')?.addEventListener('click', () => {
        engineDebugElement.style.display = 
            engineDebugElement.style.display === 'none' ? 'block' : 'none';
    });

    // Log level control
    document.getElementById('logLevel')?.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        logger.setLogLevel(parseInt(select.value) as LogLevel);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init); 