import { DebugOverlay } from './debug-overlay';
import { BaseTest } from './examples/base-test';
import { RandomScanTest } from './examples/random-scan';
import { WipeTest } from './examples/wipe-test';
import { ScrollTest } from './examples/scroll-test';
import { RippleTest } from './examples/ripple-test';
import { LaserTest } from './examples/laser-test';
import { RainTest } from './examples/rain-test';
import { JumpTest } from './examples/jump-test';
import { StringTest } from './examples/string-test';
import { PatternAnimationTest } from './examples/pattern-animation-test';
import { AnimationLoadTest } from './examples/animation-load-test';
import { logger } from '../../util/logger';
import { SmallPixelTest } from './examples/small-pixel-test';

export class TestManager {
    public currentTest: BaseTest | null = null;
    public availableTests: BaseTest[];
    public debugOverlay: DebugOverlay | null = null;

    constructor() {
        logger.info('Initializing TestManager');
        this.availableTests = this.createTests();
    }

    private createTests(): BaseTest[] {
        return [
            new RandomScanTest(),
            new WipeTest(),
            new LaserTest(),
            new RippleTest(),
            new ScrollTest(),
            new RainTest(),
            new JumpTest(),
            new StringTest(),
            new PatternAnimationTest(),
            new AnimationLoadTest(),
            new SmallPixelTest()
        ];
    }

    public selectTest(testName: string) {
        logger.info(`Selecting test: ${testName}`);
        
        // Stop current test if running
        if (this.currentTest?.isRunning) {
            this.currentTest.stop();
        }

        // Find and set new test
        this.currentTest = this.availableTests.find(test => test.getName() === testName) || null;
        
        // Start the test (which will create its display)
        if (this.currentTest) {
            this.currentTest.start();
            
            // Update debug overlay to use new display
            const debugElement = document.getElementById('debug-container');
            if (debugElement) {
                this.debugOverlay = new DebugOverlay(this.currentTest.getDisplay(), debugElement);
            }
        }
    }

    public toggleCurrentTest() {
        if (!this.currentTest) {
            logger.warn('No test selected');
            return;
        }

        if (this.currentTest.isRunning) {
            this.currentTest.stop();
        } else {
            this.currentTest.start();
        }
    }
}