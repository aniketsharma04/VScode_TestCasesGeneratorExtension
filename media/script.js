(function() {
    // Get VS Code API
    const vscode = acquireVsCodeApi();
    
    // Get test data from window
    const testData = window.testData;
    
    // Test type definitions
    const typeDefinitions = {
        normal: '✓ Normal Cases: Tests typical scenarios with standard valid inputs to ensure core functionality works as expected.',
        edge: '⚠️ Edge Cases: Tests boundary conditions, empty inputs, null/undefined values, and extreme inputs to verify robustness.',
        error: '❌ Error Cases: Tests invalid inputs and exception handling to ensure graceful error management.'
    };
    
    // Initialize when DOM is loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else {
        initializeEventListeners();
    }
    
    function initializeEventListeners() {
        // Copy All button - copy all test cases combined (clean version)
        const copyAllBtn = document.getElementById('copyAll');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => {
                const allTests = testData.testCases.map(t => cleanTestCode(t.code)).join('\n\n');
                copyToClipboard(allTests, copyAllBtn);
            });
        }
        
        // Generate More button
        const generateMoreBtn = document.getElementById('generateMore');
        if (generateMoreBtn) {
            generateMoreBtn.addEventListener('click', () => generateMore());
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
        
        // Test Type Filter Dropdown
        const filterDropdown = document.getElementById('testTypeFilter');
        if (filterDropdown) {
            filterDropdown.addEventListener('change', (e) => filterTestsByType(e.target.value));
        }
        
        // Small copy buttons for individual tests
        const smallCopyBtns = document.querySelectorAll('.copy-btn-small[data-copy]');
        smallCopyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const testId = e.currentTarget.getAttribute('data-copy');
                const testCase = testData.testCases.find(t => t.id === testId);
                if (testCase) {
                    const cleanCode = cleanTestCode(testCase.code);
                    copyToClipboard(cleanCode, e.currentTarget);
                }
            });
        });
    }
    
    /**
     * Filter tests by type (all, normal, edge, error)
     */
    function filterTestsByType(type) {
        const testCases = document.querySelectorAll('[data-test-type]');
        const definitionDiv = document.getElementById('typeDefinition');
        
        testCases.forEach(testCase => {
            if (type === 'all') {
                testCase.style.display = 'block';
            } else {
                testCase.style.display = testCase.getAttribute('data-test-type') === type ? 'block' : 'none';
            }
        });
        
        // Show/hide definition
        if (type === 'all') {
            definitionDiv.style.display = 'none';
        } else {
            definitionDiv.textContent = typeDefinitions[type] || '';
            definitionDiv.style.display = 'block';
        }
    }
    
    // Helper function to clean test code
    function cleanTestCode(code) {
        const lines = code.split('\n');
        const cleanedLines = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            // Skip comment-only lines like "// Arrange", "// Act", "// Assert", "// Scenario:"
            if (trimmed === '// Arrange' || trimmed === '// Act' || trimmed === '// Assert' || 
                trimmed === '// Setup' || trimmed === '// Execute' || trimmed === '// Verify' ||
                trimmed.startsWith('// Scenario:')) {
                continue;
            }
            cleanedLines.push(line);
        }
        
        return cleanedLines.join('\n');
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
            content: testData.fullCode,
            language: getLanguageFromTestData(),
            framework: getFrameworkFromTestData()
        });
    }
    
    /**
     * Extract language from test data or HTML
     */
    function getLanguageFromTestData() {
        // Try to get from test data
        if (window.testData && window.testData.language) {
            return window.testData.language;
        }
        
        // Fallback: try to extract from badge
        const languageBadge = document.querySelector('.badge-language');
        if (languageBadge) {
            return languageBadge.textContent.toLowerCase();
        }
        
        return 'javascript'; // Default fallback
    }
    
    /**
     * Generate more tests using existing tests as context
     */
    function generateMore() {
        vscode.postMessage({
            command: 'generateMore',
            existingTests: testData.testCases
        });
    }
    
    /**
     * Extract framework from test data or HTML
     */
    function getFrameworkFromTestData() {
        // Try to get from test data
        if (window.testData && window.testData.framework) {
            return window.testData.framework;
        }
        
        // Fallback: try to extract from badge
        const frameworkBadge = document.querySelector('.badge-framework');
        if (frameworkBadge) {
            return frameworkBadge.textContent.toLowerCase();
        }
        
        return 'jest'; // Default fallback
    }
})();
