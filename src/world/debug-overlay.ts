import { World } from './world';

interface WorldDebugMetrics {
    entityCount: number;
    spatialMapSize: number;
    eventHandlerCount: number;
    lastEventTime: number;
    lastEventType: string;
    recentEvents: Array<{
        type: string;
        timestamp: number;
        data: any;
    }>;
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
        lastEventTime: 0,
        lastEventType: '',
        recentEvents: [],
        spatialMapHotspots: []
    };

    private isVisible = false;

    constructor(
        private world: World,
        private element: HTMLElement
    ) {
        // Track events
        world.on('entityAdded', (data) => this.trackEvent('entityAdded', data));
        world.on('entityRemoved', (data) => this.trackEvent('entityRemoved', data));
        world.on('entityMoved', (data) => this.trackEvent('entityMoved', data));
        world.on('entityModified', (data) => this.trackEvent('entityModified', data));
    }

    private trackEvent(type: string, data: any) {
        this.metrics.lastEventTime = Date.now();
        this.metrics.lastEventType = type;
        
        this.metrics.recentEvents.unshift({
            type,
            timestamp: Date.now(),
            data
        });

        // Keep only last 10 events
        if (this.metrics.recentEvents.length > 10) {
            this.metrics.recentEvents.pop();
        }

        this.update();
    }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.element.style.display = this.isVisible ? 'block' : 'none';
        if (this.isVisible) {
            this.update();
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

        // Format display with minimal whitespace
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
                : '') +
            (this.metrics.recentEvents.length ? 
                `\n<div style="margin-top: 8px; border-top: 1px solid #666;">Recent Events:</div>` +
                this.metrics.recentEvents.map(e => 
                    `<div>${new Date(e.timestamp).toLocaleTimeString()}: ${e.type}</div>`
                ).join('')
                : '');

        this.element.innerHTML = html;
    }

    public destroy(): void {
        document.body.removeChild(this.element);
    }
} 