import { Component } from "../../entity/component";
import { RegisterComponent } from "../../entity/component-registry";


export interface BestMetrics {
    tilesTraveled: number;
    timesCrashed: number;
    objectivesSecured: number;
    duration: number;
    bestTilesBetweenCrashes: number;
    turboTilesTraveled: number;
    tilesDrifted: number;
}

@RegisterComponent('metrics')
export class MetricsComponent extends Component {
    public readonly type = 'metrics';

    constructor(
        public tilesTraveled: number = 0,
        public timesCrashed: number = 0,
        public objectivesSecured: number = 0,

        public objectivesThisLevel: number = 0,
        public maxObjectivesThisLevel: number = 0,

        public timeStarted: number = 0,
        public timeEnded: number = 0,
        public currentTilesBetweenCrashes: number = 0,
        public bestTilesBetweenCrashes: number = 0,
        public turboTilesTraveled: number = 0,

        public tilesDrifted: number = 0
    ) {
        super();
    }

    // Calculate the duration of the current run
    public getDuration(): number {
        if (this.timeEnded === 0) {
            return 0;
        }
        return this.timeEnded - this.timeStarted;
    }

    // Get current metrics in the format used for best metrics
    public getCurrentMetricsForComparison(): BestMetrics {
        return {
            tilesTraveled: this.tilesTraveled,
            timesCrashed: this.timesCrashed,
            objectivesSecured: this.objectivesSecured,
            duration: this.getDuration(),
            bestTilesBetweenCrashes: this.bestTilesBetweenCrashes,
            turboTilesTraveled: this.turboTilesTraveled,
            tilesDrifted: this.tilesDrifted
        };
    }

    // Static methods for best metrics management
    private static readonly STORAGE_KEY_PREFIX = 'best_metrics_';

    // Helper to get the storage key for a specific configuration
    public static getStorageKey(citySize: CitySize, helicopterMode: GameMode): string {
        return `${MetricsComponent.STORAGE_KEY_PREFIX}${citySize}-${helicopterMode}`;
    }

    // Get best metrics for a specific configuration
    public static getBestMetrics(citySize: CitySize, helicopterMode: GameMode): BestMetrics | null {
        const key = MetricsComponent.getStorageKey(citySize, helicopterMode);
        const savedMetrics = localStorage.getItem(key);
        
        if (savedMetrics) {
            try {
                return JSON.parse(savedMetrics) as BestMetrics;
            } catch (e) {
                console.error('Failed to parse saved metrics:', e);
                return null;
            }
        }
        
        return null;
    }

    // Default implementation for fromJSON
    static fromJSON(data: any): MetricsComponent {
        return new MetricsComponent(
            data.tilesTraveled,
            data.timesCrashed,
            data.objectivesSecured,
            data.objectivesThisLevel,
            data.maxObjectivesThisLevel,
            data.timeStarted,
            data.timeEnded,
            data.currentTilesBetweenCrashes,
            data.bestTilesBetweenCrashes,
            data.turboTilesTraveled,
            data.tilesDrifted
        );
    }

    // Default implementation for toJSON
    toJSON(): any {
        return {
            tilesTraveled: this.tilesTraveled,
            timesCrashed: this.timesCrashed,
            objectivesSecured: this.objectivesSecured,
            objectivesThisLevel: this.objectivesThisLevel,
            maxObjectivesThisLevel: this.maxObjectivesThisLevel,
            timeStarted: this.timeStarted,
            timeEnded: this.timeEnded,
            currentTilesBetweenCrashes: this.currentTilesBetweenCrashes,
            bestTilesBetweenCrashes: this.bestTilesBetweenCrashes,
            turboTilesTraveled: this.turboTilesTraveled,
            tilesDrifted: this.tilesDrifted
        };
    }
} 