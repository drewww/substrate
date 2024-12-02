import { DebugOverlay } from '../debug-overlay';
import { BaseTest } from './base-test';
import { RandomScanTest } from './random-scan';
import { WipeTest } from './wipe-test';
import { ScrollTest } from './scroll-test';
import { RippleTest } from './ripple-test';
import { LaserTest } from './laser-test';
import { RainTest } from './rain-test';
import { JumpTest } from './jump-test';
import { StringTest } from './string-test';
import { LogLevel } from '../display';
import { PatternAnimationTest } from './pattern-animation-test';
import { AnimationLoadTest } from './animation-load-test';

export class TestManager {
    public currentTest: BaseTest | null = null;
    public availableTests: BaseTest[];
    public debugOverlay: DebugOverlay | null = null;
    private logLevel: LogLevel = LogLevel.WARN;  // Default log level

    constructor() {
        console.log('Initializing TestManager');
        this.availableTests = this.createTests();
    }

    private createTests(): BaseTest[] {
        return [
            new RandomScanTest(this.logLevel),
            new WipeTest(this.logLevel),
            new LaserTest(this.logLevel),
            new RippleTest(this.logLevel),
            new ScrollTest(this.logLevel),
            new RainTest(this.logLevel),
            new JumpTest(this.logLevel),
            new StringTest(this.logLevel),
            new PatternAnimationTest(this.logLevel),
            new AnimationLoadTest(this.logLevel)
        ];
    }

    public setLogLevel(level: LogLevel): void {
        this.logLevel = level;
        
        // Store current test name if one is running
        const currentTestName = this.currentTest?.getName();
        const wasRunning = this.currentTest?.isRunning || false;
        
        // Recreate all tests with new log level
        this.availableTests = this.createTests();
        
        // Restore current test if there was one
        if (currentTestName) {
            this.selectTest(currentTestName);
            // Restart if it was running
            if (wasRunning) {
                this.currentTest?.start();
            }
        }
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
            this.debugOverlay = null;
        }

        // Find and set new test
        this.currentTest = this.availableTests.find(test => test.getName() === testName) || null;
        
        // Start the test (which will create its display)
        if (this.currentTest) {
            this.currentTest.start();
            // Create new debug overlay after display is created
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