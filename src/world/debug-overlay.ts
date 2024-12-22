import { World } from './world';

interface WorldDebugMetrics {
    entityCount: number;
    spatialMapSize: number;
    eventHandlerCount: number;
    spatialMapHotspots: Array<{
        position: string;
        entityCount: number;
    }>;
}

export class WorldDebugOverlay {
    private metrics: WorldDebugMetrics = {
        entityCount: 0,
        spatialMapSize: 0,
        eventHandlerCount: 0,
        spatialMapHotspots: []
    };

    private isVisible = false;
    private updateInterval: number | null = null;

    constructor(
        private world: World,
        private element: HTMLElement
    ) {}

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.element.style.display = this.isVisible ? 'block' : 'none';
        
        if (this.isVisible) {
            // Start update interval when visible
            this.updateInterval = window.setInterval(() => this.update(), 250); // Update every 250ms
            this.update(); // Initial update
        } else {
            // Stop updates when hidden
            if (this.updateInterval !== null) {
                window.clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
        }
    }

    public update(): void {
        if (!this.isVisible) return;

        // Update metrics
        this.metrics.entityCount = this.world.getEntities().length;
        this.metrics.spatialMapSize = Array.from(this.world.getSpatialMapStats().keys()).length;
        this.metrics.eventHandlerCount = this.world.getEventHandlerCount();

        // Find hotspots
        const spatialStats = this.world.getSpatialMapStats();
        this.metrics.spatialMapHotspots = Array.from(spatialStats.entries())
            .map(([pos, count]) => ({ position: pos, entityCount: count }))
            .sort((a, b) => b.entityCount - a.entityCount)
            .slice(0, 3);

        // Format display
        let html = 
            `<div style="margin-bottom: 8px; border-bottom: 1px solid #666;">World Debug</div>
<div>Entities: ${this.metrics.entityCount}</div>
<div>Spatial Map Cells: ${this.metrics.spatialMapSize}</div>
<div>Event Handlers: ${this.metrics.eventHandlerCount}</div>` +
            (this.metrics.spatialMapHotspots.length ? 
                `\n<div style="margin-top: 8px; border-top: 1px solid #666;">Hotspots:</div>` +
                this.metrics.spatialMapHotspots.map(h => 
                    `<div>${h.position}: ${h.entityCount} entities</div>`
                ).join('')
                : '');

        this.element.innerHTML = html;
    }

    public destroy(): void {
        if (this.updateInterval !== null) {
            window.clearInterval(this.updateInterval);
        }
        document.body.removeChild(this.element);
    }
} 