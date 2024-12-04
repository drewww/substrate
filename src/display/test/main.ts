import { logger } from '../util/logger';
import { TestManager } from './test-manager';

const SELECTED_TEST_KEY = 'matrix-display-selected-test';
const LOG_LEVEL_KEY = 'matrix-display-log-level';

logger.info('Display Test Environment Loading...');

document.addEventListener('DOMContentLoaded', () => {
    logger.verbose('DOM Content Loaded');
    
    try {
        const manager = new TestManager();
        logger.verbose('TestManager created');

        // Set up test selector
        const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
        manager.availableTests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.getName();
            option.text = `${test.getName()}`;
            testSelect.add(option);
        });

        testSelect.onchange = () => {
            const selectedTest = testSelect.value;
            manager.selectTest(selectedTest);
            // Save selection to localStorage
            localStorage.setItem(SELECTED_TEST_KEY, selectedTest);
        };

        // Try to restore previously selected test, fall back to first test
        const savedTest = localStorage.getItem(SELECTED_TEST_KEY);
        if (savedTest && manager.availableTests.some(test => test.getName() === savedTest)) {
            testSelect.value = savedTest;
            manager.selectTest(savedTest);
        } else if (manager.availableTests.length > 0) {
            manager.selectTest(manager.availableTests[0].getName());
        }

        // Set up control buttons
        document.getElementById('toggleTest')!.onclick = () => {
            manager.toggleCurrentTest();
        };
        
        document.getElementById('toggleDebug')!.onclick = () => {
            if (manager.currentTest && manager.debugOverlay) {
                manager.debugOverlay.toggle();
            }
        };

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                manager.toggleCurrentTest();
            } else if (e.key === 'F3') {
                if (manager.currentTest && manager.debugOverlay) {
                    manager.debugOverlay.toggle();
                }
            }
        });
        
        // Add log level control
        const logLevelSelect = document.getElementById('logLevel') as HTMLSelectElement;
        
        // Restore saved log level
        const savedLogLevel = localStorage.getItem(LOG_LEVEL_KEY);
        if (savedLogLevel !== null) {
            const level = parseInt(savedLogLevel);
            logLevelSelect.value = level.toString();
            logger.setLogLevel(level);
        }

        logLevelSelect.addEventListener('change', (e) => {
            const level = parseInt((e.target as HTMLSelectElement).value);
            logger.setLogLevel(level);
            localStorage.setItem(LOG_LEVEL_KEY, level.toString());
        });

        const toggleDirtyMaskButton = document.getElementById('toggleDirtyMask') as HTMLButtonElement;
        let isDirtyMaskEnabled = true;

        toggleDirtyMaskButton.addEventListener('click', () => {
            isDirtyMaskEnabled = manager.currentTest?.toggleDirtyMask() ?? false;
            toggleDirtyMaskButton.textContent = isDirtyMaskEnabled ? 'Dirty Mask: ON' : 'Dirty Mask: OFF';
        });

        // Initialize button state
        toggleDirtyMaskButton.textContent = 'Dirty Mask: ON';

        logger.verbose('Event listeners set up');
    } catch (error) {
        logger.error('Error in main initialization:', error);
    }
}); 