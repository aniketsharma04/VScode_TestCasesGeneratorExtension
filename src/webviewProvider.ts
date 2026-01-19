/**
 * WebView panel provider for displaying generated tests
 */

import * as vscode from 'vscode';
import type { GeneratedTests } from './types';

/**
 * Create and show WebView panel
 */
export function createTestCasePanel(
    context: vscode.ExtensionContext,
    tests: GeneratedTests
): vscode.WebviewPanel {
    // Create panel
    const panel = vscode.window.createWebviewPanel(
        'testCaseView',
        `Test Cases - ${tests.language}`,
        vscode.ViewColumn.Two,
        {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'media')
            ]
        }
    );

    // Set HTML content
    panel.webview.html = getWebviewContent(panel.webview, tests, context);

    // Handle messages from WebView
    panel.webview.onDidReceiveMessage(
        message => handleWebviewMessage(message, panel, tests),
        undefined,
        context.subscriptions
    );

    return panel;
}

/**
 * Generate HTML content for WebView
 */
function getWebviewContent(
    webview: vscode.Webview,
    tests: GeneratedTests,
    context: vscode.ExtensionContext
): string {
    // Get URIs for CSS and JS
    const styleUri = getUri(webview, context, ['media', 'styles.css']);
    const scriptUri = getUri(webview, context, ['media', 'script.js']);

    // Generate nonce for security
    const nonce = getNonce();

    // Count test types
    const normalCount = tests.testCases.filter(t => t.type === 'normal').length;
    const edgeCount = tests.testCases.filter(t => t.type === 'edge').length;
    const errorCount = tests.testCases.filter(t => t.type === 'error').length;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <link href="${styleUri}" rel="stylesheet">
    <title>Generated Test Cases</title>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header class="header">
            <h1>Generated Test Cases</h1>
            <div class="header-info">
                <span class="badge badge-language">${escapeHtml(tests.language)}</span>
                <span class="badge badge-framework">${escapeHtml(tests.framework)}</span>
                <span class="badge">Total: ${tests.testCases.length} tests</span>
            </div>
        </header>

        <!-- Stats -->
        <div class="stats">
            <div class="stat-item">
                <span class="stat-label">Normal Cases</span>
                <span class="stat-value">${normalCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Edge Cases</span>
                <span class="stat-value">${edgeCount}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Error Cases</span>
                <span class="stat-value">${errorCount}</span>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="actions">
            <button id="copyAll" class="btn btn-primary">
                <span class="icon">📋</span> Copy All Tests
            </button>
            <button id="saveFile" class="btn btn-secondary">
                <span class="icon">💾</span> Save to File
            </button>
            <button id="runTests" class="btn btn-secondary">
                <span class="icon">▶️</span> Run Tests
            </button>
        </div>

        <!-- Test Cases Display -->
        <div class="test-cases">
            ${tests.testCases.length > 0 ? `
            <div class="section">
                <h2>Generated Test Cases</h2>
                ${tests.testCases.map((test, index) => `
                    <div class="test-case test-${test.type}">
                        <div class="test-header">
                            <span class="test-number">#${index + 1}</span>
                            <span class="test-name">${escapeHtml(test.name)}</span>
                            <span class="test-type-badge badge-${test.type}">${test.type}</span>
                            <button class="copy-btn-small" data-copy="${test.id}">📋 Copy</button>
                        </div>
                        <div class="test-explanation">
                            <p><strong>What this test does:</strong> ${generateTestExplanation(test)}</p>
                        </div>
                        <div class="test-code">
                            <pre><code class="language-${escapeHtml(tests.language)}" id="${test.id}">${escapeHtml(getCleanTestCode(test.code))}</code></pre>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>

        <!-- Hidden data for script -->
        <script nonce="${nonce}">
            window.testData = ${JSON.stringify({ 
                fullCode: tests.fullCode, 
                testCases: tests.testCases,
                language: tests.language 
            })};
        </script>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </div>
</body>
</html>`;
}

/**
 * Handle messages from WebView to extension
 */
async function handleWebviewMessage(message: any, panel: vscode.WebviewPanel, tests: GeneratedTests): Promise<void> {
    switch (message.command) {
        case 'copy':
            vscode.window.showInformationMessage('✅ Copied to clipboard!');
            break;

        case 'saveFile':
            await saveTestsToFile(message.content, message.language);
            break;

        case 'runTests':
            await runTestsInTerminal(message.content);
            break;

        case 'error':
            vscode.window.showErrorMessage(message.text);
            break;
    }
}

/**
 * Save tests to file
 */
async function saveTestsToFile(content: string, language: string): Promise<void> {
    try {
        const extension = getFileExtension(language);
        const fileName = `generated-tests${extension}`;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(fileName),
            filters: {
                'Test Files': [extension.substring(1)],
                'All Files': ['*']
            }
        });

        if (uri) {
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
            vscode.window.showInformationMessage(`✅ Tests saved to ${uri.fsPath}`);

            // Ask if user wants to open the file
            const open = await vscode.window.showInformationMessage(
                'Open the saved file?',
                'Yes', 'No'
            );

            if (open === 'Yes') {
                const document = await vscode.workspace.openTextDocument(uri);
                await vscode.window.showTextDocument(document);
            }
        }
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to save file: ${error.message}`);
    }
}

/**
 * Run tests in terminal
 */
async function runTestsInTerminal(testCode: string): Promise<void> {
    try {
        const terminal = vscode.window.createTerminal('Test Runner');
        terminal.show();

        // Try to detect test command based on project
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const packageJsonUri = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
            try {
                const packageJson = await vscode.workspace.fs.readFile(packageJsonUri);
                const packageData = JSON.parse(packageJson.toString());

                if (packageData.scripts?.test) {
                    terminal.sendText('npm test');
                    return;
                }
            } catch {
                // File doesn't exist or can't be parsed
            }
        }

        vscode.window.showWarningMessage('No test script found. Please run tests manually or configure your test command.');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to run tests: ${error.message}`);
    }
}

/**
 * Get file extension for language
 */
function getFileExtension(language: string): string {
    const extensions: { [key: string]: string } = {
        'javascript': '.test.js',
        'typescript': '.test.ts',
        'python': '_test.py',
        'java': 'Test.java',
        'go': '_test.go',
        'rust': '_test.rs',
        'cpp': '_test.cpp',
        'csharp': 'Tests.cs',
        'ruby': '_spec.rb',
        'php': 'Test.php'
    };
    return extensions[language] || '.test.txt';
}

/**
 * Generate human-readable explanation for a test case
 */
function generateTestExplanation(test: any): string {
    const name = test.name.toLowerCase();
    
    // Extract key information from test name
    if (name.includes('error') || name.includes('throw') || name.includes('invalid')) {
        return `Verifies that the function properly handles error scenarios and throws appropriate exceptions when given invalid input.`;
    } else if (name.includes('edge') || name.includes('empty') || name.includes('null') || name.includes('zero')) {
        return `Tests edge cases and boundary conditions to ensure the function behaves correctly with unusual or extreme input values.`;
    } else if (name.includes('negative')) {
        return `Checks how the function handles negative values to ensure proper validation and processing.`;
    } else if (name.includes('multiple') || name.includes('array') || name.includes('collection')) {
        return `Tests the function with multiple items or collections to verify it processes them correctly.`;
    } else {
        return `Validates the standard functionality with typical input values to ensure the function works as expected.`;
    }
}

/**
 * Clean test code by removing excessive comments but keeping structure
 */
function getCleanTestCode(code: string): string {
    const lines = code.split('\n');
    const cleanedLines: string[] = [];
    
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

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generate nonce for CSP
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Get URI for media resources
 */
function getUri(webview: vscode.Webview, context: vscode.ExtensionContext, pathSegments: string[]): vscode.Uri {
    return webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, ...pathSegments));
}
