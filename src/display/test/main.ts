import { logger } from '../util/logger';
import { TestManager } from './test-manager';

const SELECTED_TEST_KEY = 'matrix-display-selected-test';

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
        logLevelSelect.addEventListener('change', (e) => {
            const level = parseInt((e.target as HTMLSelectElement).value);
            logger.setLogLevel(level);
        });

        logger.verbose('Event listeners set up');
    } catch (error) {
        logger.error('Error in main initialization:', error);
    }
}); 