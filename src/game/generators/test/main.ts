import { Display } from '../../../display/display';
import { World } from '../../../world/world';

// Create a simple 20x20 world
const world = new World(20, 20);

// Create display with 20x20 tiles, each 20x20 pixels
const display = new Display({
    elementId: 'game-canvas',
    cellWidth: 20,
    cellHeight: 20,
    viewportWidth: 20,
    viewportHeight: 20,
    worldWidth: 20,
    worldHeight: 20
}); 