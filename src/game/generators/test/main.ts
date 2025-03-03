import { Display } from '../../../display/display';
import { World } from '../../../world/world';
import { LayoutGenerator } from '../layout-generator';
import { LayoutRenderer } from '../layout-renderer';
import { LSystemLayoutGenerator } from '../l-system-layout-generator';

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

// Create and use the L-System layout generator
const width = 20;
const height = 20;

let generator = new LSystemLayoutGenerator(width, height);

// Generate the layout
// const layout = generator.generate();

// You can add any visualization or testing code here
console.log("Layout generation complete");

// Create layout generator and renderer
// let layoutGenerator = new LayoutGenerator(20, 20);
const renderer = new LayoutRenderer(display);
// renderer.renderLayout(layout);

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
            generator = new LSystemLayoutGenerator(20, 20);
            renderer.renderLayout(generator.getCurrentLayout());
            break;
    }
}); 