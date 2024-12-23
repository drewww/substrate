import { BasicTestGame } from './basic-test-game';
import { logger, LogLevel } from '../../util/logger';
import { DebugOverlay } from '../../display/test/debug-overlay';
import { WorldDebugOverlay } from '../../world/debug-overlay';

let game: BasicTestGame;
let displayDebug: DebugOverlay;
let worldDebug: WorldDebugOverlay;

function init() {
    // Initialize game
    const canvas = document.getElementById('display') as HTMLCanvasElement;
    game = new BasicTestGame(canvas.id);
    
    // Set up debug overlays
    const displayDebugElement = document.getElementById('display-debug')!;
    const worldDebugElement = document.getElementById('world-debug')!;
    
    displayDebug = new DebugOverlay(game.getDisplay(), displayDebugElement);
    worldDebug = new WorldDebugOverlay(game.getWorld(), worldDebugElement);
    
    // Set up controls
    setupControls();
    
    // Start game
    game.start();
}

function setupControls() {
    // Debug toggles
    document.getElementById('toggleDisplayDebug')?.addEventListener('click', () => {
        displayDebug.toggle();
    });

    document.getElementById('toggleWorldDebug')?.addEventListener('click', () => {
        worldDebug.toggle();
    });

    // Log level control
    document.getElementById('logLevel')?.addEventListener('change', (e) => {
        const select = e.target as HTMLSelectElement;
        logger.setLogLevel(parseInt(select.value) as LogLevel);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init); 