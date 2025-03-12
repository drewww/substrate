import { GameMode } from '../../render/title-renderer';
import { CitySize } from '../../render/title-renderer';
import { logger } from '../../util/logger';
import { MetricsComponent, BestMetrics } from '../components/metrics.component';

export class MetricsTrackerService {
    private static instance: MetricsTrackerService;

    private constructor() {}

    public static getInstance(): MetricsTrackerService {
        if (!MetricsTrackerService.instance) {
            MetricsTrackerService.instance = new MetricsTrackerService();
        }
        return MetricsTrackerService.instance;
    }

    // Check if current metrics are better than stored best metrics
    public checkAndUpdateBestMetrics(
        metrics: MetricsComponent, 
        citySize: CitySize, 
        helicopterMode: GameMode
    ): void {
        const currentMetrics = metrics.getCurrentMetricsForComparison();
        const bestMetrics = MetricsComponent.getBestMetrics(citySize, helicopterMode);

        logger.warn('Current metrics:', currentMetrics);
        logger.warn('Best metrics:', bestMetrics);
        

        if (!bestMetrics) {
            // No previous best metrics, save current as best
            this.saveBestMetrics(currentMetrics, citySize, helicopterMode);
            return;
        }

        // Create a new object to store updated best metrics
        const newBestMetrics: BestMetrics = { ...bestMetrics };
        let hasImprovement = false;

        // Check each metric and update if better
        // For tilesTraveled, timesCrashed, duration - lower is better
        if (currentMetrics.tilesTraveled < bestMetrics.tilesTraveled) {
            newBestMetrics.tilesTraveled = currentMetrics.tilesTraveled;
            hasImprovement = true;
        }

        if (currentMetrics.timesCrashed < bestMetrics.timesCrashed) {
            newBestMetrics.timesCrashed = currentMetrics.timesCrashed;
            hasImprovement = true;
        }

        if (currentMetrics.duration < bestMetrics.duration && currentMetrics.duration > 0) {
            newBestMetrics.duration = currentMetrics.duration;
            hasImprovement = true;
        }

        // For objectivesSecured, bestTilesBetweenCrashes, turboTilesTraveled, tilesDrifted - higher is better
        if (currentMetrics.objectivesSecured > bestMetrics.objectivesSecured) {
            newBestMetrics.objectivesSecured = currentMetrics.objectivesSecured;
            hasImprovement = true;
        }

        if (currentMetrics.bestTilesBetweenCrashes > bestMetrics.bestTilesBetweenCrashes) {
            newBestMetrics.bestTilesBetweenCrashes = currentMetrics.bestTilesBetweenCrashes;
            hasImprovement = true;
        }

        if (currentMetrics.turboTilesTraveled > bestMetrics.turboTilesTraveled) {
            newBestMetrics.turboTilesTraveled = currentMetrics.turboTilesTraveled;
            hasImprovement = true;
        }

        if (currentMetrics.tilesDrifted > bestMetrics.tilesDrifted) {
            newBestMetrics.tilesDrifted = currentMetrics.tilesDrifted;
            hasImprovement = true;
        }

        if (currentMetrics.damageTaken < bestMetrics.damageTaken) {
            newBestMetrics.damageTaken = currentMetrics.damageTaken;
            hasImprovement = true;
        }

        // If any metric improved, save the new best metrics
        if (hasImprovement) {
            this.saveBestMetrics(newBestMetrics, citySize, helicopterMode);
        }
    }

    // Save best metrics to localStorage
    private saveBestMetrics(metrics: BestMetrics, citySize: CitySize, helicopterMode: GameMode): void {
        const key = MetricsComponent.getStorageKey(citySize, helicopterMode);
        localStorage.setItem(key, JSON.stringify(metrics));
    }

    // Get all best metrics for all configurations
    public getAllBestMetrics(): Record<string, BestMetrics> {
        const result: Record<string, BestMetrics> = {};
        const citySizes: CitySize[] = ['small', 'medium', 'large'];
        const helicopterModes: GameMode[] = ['helicopter-on', 'helicopter-off'];

        for (const size of citySizes) {
            for (const mode of helicopterModes) {
                const key = `${size}-${mode}`;
                const metrics = MetricsComponent.getBestMetrics(size, mode);
                if (metrics) {
                    result[key] = metrics;
                }
            }
        }

        return result;
    }
} 