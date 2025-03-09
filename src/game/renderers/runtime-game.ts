import { Display } from "../../display/display";

private setupMinimap(gameWorld: World): void {
    const cityGenerator = this.generator as unknown as CityBlockGenerator;
    const layout = cityGenerator.getLayout();
    const blockWidth = Math.floor(gameWorld.getWorldWidth() / 12);
    const blockHeight = Math.floor(gameWorld.getWorldHeight() / 12);

    // Create minimap display with larger cell size for better visibility
    this.minimapDisplay = new Display({
        elementId: 'minimap',
        worldWidth: blockWidth,
        worldHeight: blockHeight,
        cellWidth: 40,  // Increased from 10 to 40
        cellHeight: 40, // Increased from 10 to 40
        viewportWidth: blockWidth,
        viewportHeight: blockHeight
    });

    // Create minimap renderer
    this.minimapRenderer = new MinimapRenderer(this.minimapDisplay, this.world!);
    this.minimapRenderer.renderLayout(cityGenerator.getLayout()!);

    if (layout) {
        this.minimapRenderer.renderLayout(layout);
    }
} 