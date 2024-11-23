import { TestManager } from './tests/test-manager';

console.log('main.ts starting');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    try {
        const manager = new TestManager();
        console.log('TestManager created');

        // Set up test selector
        const testSelect = document.getElementById('testSelect') as HTMLSelectElement;
        manager.getAvailableTests().forEach(test => {
            const option = document.createElement('option');
            option.value = test.name;
            option.text = `${test.name} - ${test.description}`;
            testSelect.add(option);
        });

        testSelect.onchange = () => {
            manager.selectTest(testSelect.value);
        };

        // Select first test by default
        manager.selectTest(manager.getAvailableTests()[0].name);

        // Set up control buttons
        document.getElementById('toggleTest')!.onclick = () => {
            manager.toggleCurrentTest();
        };
        
        document.getElementById('toggleDebug')!.onclick = () => {
            manager.debugOverlay.toggle();
        };

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                manager.toggleCurrentTest();
            } else if (e.key === 'F3') {
                manager.debugOverlay.toggle();
            }
        });

        console.log('Event listeners set up');
    } catch (error) {
        console.error('Error in main initialization:', error);
    }
}); 