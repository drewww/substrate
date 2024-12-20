import { Entity } from './entity';
import { Point } from '../types';
import { TimerComponent, SmokeBombComponent, FadeComponent } from './component';

export class SmokeBombEntity extends Entity {
    private explosionTimer: TimerComponent;
    
    constructor(position: Point) {
        super(position);
        
        this.setComponent(new SmokeBombComponent(1, '#FFFFFF'));
        this.explosionTimer = new TimerComponent(0.5, 0.5);
        this.setComponent(this.explosionTimer);
    }

    update(deltaTime: number) {
        this.explosionTimer.remaining -= deltaTime;
        
        if (this.explosionTimer.remaining <= 0) {
            this.explode();
        }
    }

    private explode() {
        const pos = this.getPosition();
        const pattern = [
            {x: 0, y: 0}, {x: 1, y: 0}, {x: -1, y: 0},
            {x: 0, y: 1}, {x: 0, y: -1},
            {x: 1, y: 1}, {x: -1, y: 1},
            {x: 1, y: -1}, {x: -1, y: -1}
        ];

        // Create smoke clouds
        for (const offset of pattern) {
            const cloudPos = {
                x: pos.x + offset.x,
                y: pos.y + offset.y
            };
            
            const cloud = new SmokeCloudEntity(cloudPos);
            try {
                this.world?.addEntity(cloud);
            } catch (e) {
                // Ignore out-of-bounds positions
                continue;
            }
        }
        
        // Remove self
        this.world?.removeEntity(this.getId());
    }
}

export class SmokeCloudEntity extends Entity {
    private lifetime: TimerComponent;
    private fadeProgress = 0;
    
    constructor(position: Point) {
        super(position);
        this.lifetime = new TimerComponent(4.0, 4.0);
        this.setComponent(this.lifetime);
        this.setComponent(new FadeComponent(1.0, 0.0, 4.0));
    }

    update(deltaTime: number) {
        this.lifetime.remaining -= deltaTime;
        this.fadeProgress = 1 - (this.lifetime.remaining / this.lifetime.total);
        
        // Store fade progress in component for renderer to use
        const fadeComponent = this.getComponent('fade') as FadeComponent;
        if (fadeComponent) {
            fadeComponent.startOpacity = 1 - this.fadeProgress;
        }
        
        if (this.lifetime.remaining <= 0) {
            this.world?.removeEntity(this.getId());
        }
    }
} 