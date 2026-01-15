(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // Get test data from window
    const testData = window.testData;
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }
    
    function initializeEventListeners() {
        // Copy All button
        const copyAllBtn = document.getElementById('copyAll');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => copyToClipboard(testData.fullCode, copyAllBtn));
        }
        
        // Save File button
        const saveFileBtn = document.getElementById('saveFile');
        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => saveToFile());
        }
        
        // Run Tests button
        const runTestsBtn = document.getElementById('runTests');
        if (runTestsBtn) {
            runTestsBtn.addEventListener('click', () => runTests());
        }
        
        // Individual copy buttons in code blocks
        const copyBtns = document.querySelectorAll('.copy-btn[data-copy]');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.getAttribute('data-copy');
                if (target === 'full') {
                    copyToClipboard(testData.fullCode, e.currentTarget);
                }
            });
        });
        
        // Small copy buttons for individual tests
        const smallCopyBtns = document.querySelectorAll('.copy-btn-small[data-copy]');
        smallCopyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const testId = e.currentTarget.getAttribute('data-copy');
                const testCase = testData.testCases.find(t => t.id === testId);
                if (testCase) {
                    copyToClipboard(testCase.code, e.currentTarget);
                }
            });
        });
    }
    
    async function copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalText = button.textContent;
            button.textContent = '✓ Copied!';
            button.classList.add('copied');
            
            // Send message to extension
            vscode.postMessage({
                command: 'copy',
                success: true
            });
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy:', err);
            vscode.postMessage({
                command: 'error',
                text: 'Failed to copy to clipboard'
            });
        }
    }
    
    function saveToFile() {
        vscode.postMessage({
            command: 'saveFile',
            content: testData.fullCode,
            language: testData.language || 'javascript'
        });
    }
    
    function runTests() {
        vscode.postMessage({
            command: 'runTests',
            content: testData.fullCode
        });
    }
})();
