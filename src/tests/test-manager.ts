import { DebugOverlay } from '../debug-overlay';
import { BaseTest } from './base-test';
import { RandomScanTest } from './random-scan';
import { WipeTest } from './wipe-test';
import { ScrollTest } from './scroll-test';
import { RippleTest } from './ripple-test';
import { LaserTest } from './laser-test';
import { RainTest } from './rain-test';

export class TestManager {
    public currentTest: BaseTest | null = null;
    public availableTests: BaseTest[];
    public debugOverlay: DebugOverlay;

    constructor() {
        console.log('Initializing TestManager');
        
        // Initialize available tests
        this.availableTests = [
            new RandomScanTest(),
            new WipeTest(),
            new LaserTest(),
            new RippleTest(),
            new ScrollTest(),
            new RainTest()
        ];

        // Initialize debug overlay with first test's display
        this.debugOverlay = new DebugOverlay(this.availableTests[0].getDisplay());
    }

    public selectTest(testName: string) {
        console.log(`Selecting test: ${testName}`);
        
        // Stop current test if running
        if (this.currentTest?.isRunning) {
            this.currentTest.stop();
        }

        // Find and set new test
        this.currentTest = this.availableTests.find(test => test.getName() === testName) || null;
        
        // Update debug overlay to use new test's display
        if (this.currentTest) {
            this.debugOverlay = new DebugOverlay(this.currentTest.getDisplay());
        }
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