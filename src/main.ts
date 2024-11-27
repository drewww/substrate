import { TestManager } from './tests/test-manager';

console.log('main.ts starting');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    try {
        const manager = new TestManager();
        console.log('TestManager created');

        // Set up test selector
        const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
        manager.availableTests.forEach(test => {
            const option = document.createElement('option');
            option.value = test.getName();
            option.text = `${test.getName()}`;
            testSelect.add(option);
        });

        testSelect.onchange = () => {
            manager.selectTest(testSelect.value);
        };

        // Select first test by default
        if (manager.availableTests.length > 0) {
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
            manager.setLogLevel(level);
        });

        console.log('Event listeners set up');
    } catch (error) {
        console.error('Error in main initialization:', error);
    }
}); 