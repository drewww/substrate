import { TestRunner } from './tests/test-runner';

console.log('main.ts starting');

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    
    try {
        const runner = new TestRunner();
        console.log('TestRunner created');

        const toggleTestButton = document.getElementById('toggleTest');
        const toggleDebugButton = document.getElementById('toggleDebug');

        if (!toggleTestButton || !toggleDebugButton) {
            console.error('Could not find required buttons');
            return;
        }

        toggleTestButton.onclick = () => {
            console.log('Toggle test button clicked');
            runner.toggle();
        };
        
        toggleDebugButton.onclick = () => {
            console.log('Toggle debug button clicked');
            runner.debugOverlay.toggle();
        };

        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.key);
            if (e.key === ' ') {
                runner.toggle();
            } else if (e.key === 'F3') {
                runner.debugOverlay.toggle();
            }
        });

        console.log('Event listeners set up');
    } catch (error) {
        console.error('Error in main initialization:', error);
    }
}); 