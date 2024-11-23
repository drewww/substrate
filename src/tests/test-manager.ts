import { MatrixDisplay } from '../matrix-display';
import { DebugOverlay } from '../debug-overlay';
import { BaseTest } from './base-test';
import { RandomScanTest } from './random-scan';
import { WipeTest } from './wipe-test';
import { ScrollTest } from './scroll-test';
import { RippleTest } from './ripple-test';
import { LaserTest } from './laser-test';

export class TestManager {
    private display: MatrixDisplay;
    public debugOverlay: DebugOverlay;
    private currentTest: BaseTest | null = null;
    private availableTests: BaseTest[];

    constructor() {
        console.log('Initializing TestManager');
        this.display = new MatrixDisplay({
            elementId: 'display',
            cellSize: 12,
            worldWidth: 50,
            worldHeight: 50,
            viewportWidth: 50,
            viewportHeight: 50
        });
        
        this.debugOverlay = new DebugOverlay(this.display);
        
        // Initialize available tests
        this.availableTests = [
            new RandomScanTest(this.display),
            new WipeTest(this.display),
            new ScrollTest(this.display),
            new RippleTest(this.display),
            new LaserTest(this.display),
        ];

        console.log('TestManager initialization complete');
    }

    public getAvailableTests(): Array<{name: string, description: string}> {
        return this.availableTests.map(test => ({
            name: test.getName(),
            description: test.getDescription()
        }));
    }

    public selectTest(testName: string) {
        console.log(`Selecting test: ${testName}`);
        
        // Stop current test if running
        if (this.currentTest?.isRunning) {
            this.currentTest.stop();
        }

        // Clear display
        this.display.clear();
        
        // Find and set new test
        this.currentTest = this.availableTests.find(test => test.getName() === testName) || null;
    }

    public toggleCurrentTest() {
        if (!this.currentTest) {
            console.warn('No test selected');
            return;
        }

        if (this.currentTest.isRunning) {
            this.currentTest.stop();
        } else {
            this.currentTest.start();
        }
    }
} 