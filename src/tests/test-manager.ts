import { DebugOverlay } from '../debug-overlay';
import { BaseTest } from './base-test';
import { RandomScanTest } from './random-scan';
import { WipeTest } from './wipe-test';
import { ScrollTest } from './scroll-test';
import { RippleTest } from './ripple-test';
import { LaserTest } from './laser-test';
import { RainTest } from './rain-test';
import { ZIndexTest } from './zindex-test';

export class TestManager {
    public currentTest: BaseTest | null = null;
    public availableTests: BaseTest[];
    public debugOverlay: DebugOverlay | null = null;

    constructor() {
        console.log('Initializing TestManager');
        
        // Initialize available tests
        this.availableTests = [
            new RandomScanTest(),
            new WipeTest(),
            new LaserTest(),
            new RippleTest(),
            new ScrollTest(),
            new RainTest(),
            new ZIndexTest()
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

        // Clean up old debug overlay
        if (this.debugOverlay) {
            console.log('Removing old debug overlay');
            this.debugOverlay.remove();
            const overlayElements = document.querySelectorAll('div[style*="position: fixed"]');
            console.log(`Found ${overlayElements.length} overlay elements after remove`);
            this.debugOverlay = null;
        }

        // Find and set new test
        this.currentTest = this.availableTests.find(test => test.getName() === testName) || null;
        
        // Create new debug overlay
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