import { Display } from '../../../display/display';
import { World } from '../../../world/world';
import { LayoutGenerator } from '../layout-generator';
import { LayoutRenderer } from '../layout-renderer';

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

// Create layout generator and renderer
const generator = new LayoutGenerator(20, 20);
const renderer = new LayoutRenderer(display);

// Generate and render initial layout
const initialLayout = generator.generate();
renderer.renderLayout(initialLayout);

// Add keyboard listener to regenerate layout on any key press
document.addEventListener('keydown', () => {
    const newLayout = generator.generate();
    renderer.renderLayout(newLayout);
}); 