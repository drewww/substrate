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
let generator = new LayoutGenerator(20, 20);
const renderer = new LayoutRenderer(display);
renderer.renderLayout(generator.getCurrentLayout());

// Generate and render initial layout
// const initialLayout = generator.generate();

// Add keyboard listener for step-by-step generation
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 's':
            // Step forward one road placement
            generator.step();
            renderer.renderLayout(generator.getCurrentLayout());
            break;
        case 'g':
            // Generate complete layout
            generator.generate();
            renderer.renderLayout(generator.getCurrentLayout());
            break;
        case 'r':
            // Reset layout
            generator = new LayoutGenerator(20, 20);
            renderer.renderLayout(generator.getCurrentLayout());
            break;
    }
}); 