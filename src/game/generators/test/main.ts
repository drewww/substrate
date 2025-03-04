import { Display } from '../../../display/display';
import { World } from '../../../world/world';
import { StagedLayoutGenerator } from '../staged-layout-generator';
import { LayoutRenderer } from '../layout-renderer';
import { TestLayoutGenerator } from '../test-layout-generator';

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

// Create and use the Staged layout generator
const width = 20;
const height = 20;

let generator:StagedLayoutGenerator = new TestLayoutGenerator(width, height);
const renderer = new LayoutRenderer(display);

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
            generator = new StagedLayoutGenerator(20, 20);
            renderer.renderLayout(generator.getCurrentLayout());
            break;
    }
}); 