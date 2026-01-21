/**
 * WebView panel provider for displaying generated tests
 */

import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { GeneratedTests, TestCase } from './types';
import { generateTests } from './testCaseGenerator';

const execAsync = promisify(exec);
let outputChannel: vscode.OutputChannel | null = null;

// Store current context for "Generate More" functionality
interface PanelContext {
    code: string;
    language: string;
    config: any;
    allHistoricalTests: TestCase[];  // Track all tests ever generated for deduplication
}
const panelContexts = new Map<string, PanelContext>();

/**
 * Create and show WebView panel
 */
export function createTestCasePanel(
    context: vscode.ExtensionContext,
    tests: GeneratedTests,
    code?: string,
    config?: any
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
    
    // Store panel context if provided
    if (code && config) {
        panelContexts.set(panel.title, {
            code,
            language: tests.language,
            config,
            allHistoricalTests: [...tests.testCases]  // Initialize with first batch
        });
    }
    
    // Clean up context when panel is disposed
    panel.onDidDispose(() => {
        panelContexts.delete(panel.title);
    });

    // Set HTML content
    panel.webview.html = getWebviewContent(panel.webview, tests, context);

    // Handle messages from WebView
    panel.webview.onDidReceiveMessage(
        message => handleWebviewMessage(message, panel, tests, context),
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
            <button id="generateMore" class="btn btn-accent">
                <span class="icon">➕</span> Generate More (12 Tests)
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
                language: tests.language,
                framework: tests.framework
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
async function handleWebviewMessage(
    message: any, 
    panel: vscode.WebviewPanel, 
    tests: GeneratedTests,
    context: vscode.ExtensionContext
): Promise<void> {
    switch (message.command) {
        case 'copy':
            vscode.window.showInformationMessage('✅ Copied to clipboard!');
            break;

        case 'saveFile':
            await saveTestsToFile(message.content, message.language);
            break;

        case 'runTests':
            await runTestsWithFrameworkCheck(
                message.content, 
                message.language, 
                message.framework
            );
            break;
        
        case 'generateMore':
            await handleGenerateMore(message, panel, tests, context);
            break;

        case 'error':
            vscode.window.showErrorMessage(message.text);
            break;
    }
}

/**
 * Handle "Generate More" tests request
 */
async function handleGenerateMore(
    message: any,
    panel: vscode.WebviewPanel,
    currentTests: GeneratedTests,
    context: vscode.ExtensionContext
): Promise<void> {
    try {
        // Get stored context
        const panelContext = panelContexts.get(panel.title);
        if (!panelContext) {
            vscode.window.showErrorMessage('Cannot generate more tests: context not found. Please regenerate tests from source code.');
            return;
        }
        
        // Show progress
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Generating 12 more test cases...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0, message: 'Analyzing existing tests...' });
                
                // Use ALL historical tests for deduplication (not just visible ones)
                const allHistoricalTests = panelContext.allHistoricalTests;
                progress.report({ increment: 30, message: `Calling AI...` });
                
                const newTests = await generateTests(
                    panelContext.code,
                    panelContext.language as any,
                    panelContext.config,
                    currentTests.framework,
                    allHistoricalTests  // Pass all historical tests
                );
                
                progress.report({ increment: 70, message: 'Preparing new tests...' });
                
                // Replace with new tests (don't merge, only show latest 12)
                const replacedTests: GeneratedTests = {
                    ...currentTests,
                    testCases: newTests.testCases,  // REPLACE: Only show new 12 tests
                    fullCode: newTests.fullCode,
                    timestamp: Date.now()
                };
                
                // Update historical tests in context (add new tests to history)
                panelContext.allHistoricalTests = [...allHistoricalTests, ...newTests.testCases];
                panelContexts.set(panel.title, panelContext);
                
                // Update the panel with only new tests
                panel.webview.html = getWebviewContent(panel.webview, replacedTests, context);
                
                progress.report({ increment: 100, message: 'Done!' });
                
                // Show success message (simple, no cumulative count)
                vscode.window.showInformationMessage(
                    `✅ Generated 12 new tests`
                );
            }
        );
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate more tests: ${error.message}`);
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
 * Run tests in terminal with temporary file creation
 */
async function runTestsInTerminal(
    testCode: string,
    language: string,
    framework: string
): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        // Create temporary test file
        const tempFileName = getTempTestFileName(language, framework);
        const tempFilePath = vscode.Uri.joinPath(workspaceFolder.uri, tempFileName);
        
        // FIX MODULE PATHS BEFORE WRITING FILE
        const fixedCode = await fixModulePaths(testCode, language);
        
        // Write test code to file with fixed paths
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempFilePath, encoder.encode(fixedCode));
        
        // Get test command based on language and framework
        const testCommand = getTestCommand(language, framework, tempFileName);
        
        if (!testCommand) {
            vscode.window.showErrorMessage(`Unable to determine test command for ${language} with ${framework}`);
            return;
        }
        
        // Create and show terminal
        const terminal = vscode.window.createTerminal({
            name: 'Test Runner',
            cwd: workspaceFolder.uri.fsPath
        });
        
        terminal.show();
        
        // Show info message with directory
        vscode.window.showInformationMessage(`Running tests in: ${workspaceFolder.uri.fsPath}`);
        
        // Execute as a single command block to ensure directory context
        const commandBlock = `cd "${workspaceFolder.uri.fsPath}"; Write-Host "Working Directory: $(Get-Location)" -ForegroundColor Green; ${testCommand}`;
        terminal.sendText(commandBlock);
        
        // Optional: Clean up after a delay
        setTimeout(async () => {
            const shouldDelete = await vscode.window.showQuickPick(
                ['Yes', 'No'],
                { 
                    placeHolder: `Delete temporary test file (${tempFileName})?` 
                }
            );
            
            if (shouldDelete === 'Yes') {
                try {
                    await vscode.workspace.fs.delete(tempFilePath);
                    vscode.window.showInformationMessage('Temporary test file deleted.');
                } catch (error) {
                    console.error('Failed to delete temp file:', error);
                }
            }
        }, 5000); // Wait 5 seconds before asking
        
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to run tests: ${error.message}`);
        console.error('Run tests error:', error);
    }
}

/**
 * Fix module paths in generated test code
 */
async function fixModulePaths(testCode: string, language: string): Promise<string> {
    if (language !== 'javascript' && language !== 'typescript') {
        return testCode;
    }
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return testCode;
    }
    
    // Get the current file name without extension
    const uri = editor.document.uri;
    const fileName = uri.path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'module';
    const fullFileName = uri.path.split('/').pop() || 'module';
    
    // Language-specific fixes
    let fixed = testCode;
    
    // JavaScript/TypeScript - require() and import
    fixed = fixed
        .replace(/require\(['"]\.\/your_module_name['"]\)/g, `require('./${fileName}')`)
        .replace(/require\(['"]\.\/module['"]\)/g, `require('./${fileName}')`)
        .replace(/require\(['"]\.\/yourFile['"]\)/g, `require('./${fileName}')`)
        .replace(/from\s+['"]\.\/your_module_name['"]/g, `from './${fileName}'`)
        .replace(/from\s+['"]\.\/module['"]/g, `from './${fileName}'`)
        .replace(/from\s+['"]\.\/yourFile['"]/g, `from './${fileName}'`);
    
    // Python - from X import Y
    fixed = fixed
        .replace(/from\s+your_module_name\s+import/g, `from ${fileName} import`)
        .replace(/from\s+module\s+import/g, `from ${fileName} import`)
        .replace(/from\s+yourFile\s+import/g, `from ${fileName} import`)
        .replace(/import\s+your_module_name/g, `import ${fileName}`)
        .replace(/import\s+module(?!\s*\.)/g, `import ${fileName}`)
        .replace(/import\s+yourFile/g, `import ${fileName}`);
    
    // Java - import statements
    const className = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    fixed = fixed
        .replace(/import\s+YourClass;/g, `import ${className};`)
        .replace(/import\s+Module;/g, `import ${className};`)
        .replace(/new\s+YourClass\(/g, `new ${className}(`)
        .replace(/new\s+Module\(/g, `new ${className}(`)
        .replace(/YourClass\./g, `${className}.`)
        .replace(/Module\./g, `${className}.`);
    
    return fixed;
}

/**
 * Run tests with output channel for better results display
 */
async function runTestsWithOutput(
    testCode: string,
    language: string,
    framework: string
): Promise<void> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return;
        }

        // Create output channel if it doesn't exist
        if (!outputChannel) {
            outputChannel = vscode.window.createOutputChannel('Test Results');
        }
        
        outputChannel.clear();
        outputChannel.show();
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine(`Running ${framework} tests...`);
        outputChannel.appendLine('='.repeat(80));
        outputChannel.appendLine('');

        // Create temp file
        const tempFileName = getTempTestFileName(language, framework);
        const tempFilePath = vscode.Uri.joinPath(workspaceFolder.uri, tempFileName);
        
        // FIX MODULE PATHS BEFORE WRITING FILE
        const fixedCode = await fixModulePaths(testCode, language);
        
        // Write fixed code to temp file
        const encoder = new TextEncoder();
        await vscode.workspace.fs.writeFile(tempFilePath, encoder.encode(fixedCode));

        // Get test command
        const testCommand = getTestCommand(language, framework, tempFileName);
        
        if (!testCommand) {
            outputChannel.appendLine(`❌ Error: No test command found for ${language} with ${framework}`);
            return;
        }

        outputChannel.appendLine(`Command: ${testCommand}`);
        outputChannel.appendLine('');

        // Execute tests
        try {
            const { stdout, stderr } = await execAsync(testCommand, {
                cwd: workspaceFolder.uri.fsPath,
                timeout: 30000 // 30 second timeout
            });

            if (stdout) {
                outputChannel.appendLine('OUTPUT:');
                outputChannel.appendLine(stdout);
            }

            if (stderr) {
                outputChannel.appendLine('ERRORS:');
                outputChannel.appendLine(stderr);
            }

            outputChannel.appendLine('');
            outputChannel.appendLine('='.repeat(80));
            outputChannel.appendLine('✅ Tests completed successfully!');
            
            vscode.window.showInformationMessage('✅ Tests completed! Check Output panel for results.');

        } catch (execError: any) {
            outputChannel.appendLine('ERROR:');
            outputChannel.appendLine(execError.stdout || '');
            outputChannel.appendLine(execError.stderr || '');
            outputChannel.appendLine('');
            outputChannel.appendLine('='.repeat(80));
            outputChannel.appendLine('❌ Tests failed or encountered errors.');
            
            vscode.window.showErrorMessage('❌ Tests failed. Check Output panel for details.');
        }

        // Clean up temp file
        try {
            await vscode.workspace.fs.delete(tempFilePath);
            outputChannel.appendLine(`Cleaned up temporary file: ${tempFileName}`);
        } catch {
            outputChannel.appendLine(`Note: Temporary file ${tempFileName} may still exist.`);
        }

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to run tests: ${error.message}`);
    }
}

/**
 * Get temporary test file name based on language and framework
 */
function getTempTestFileName(language: string, framework: string): string {
    const timestamp = Date.now();
    
    const fileNames: { [key: string]: string } = {
        'javascript-jest': `temp.test.${timestamp}.js`,
        'javascript-mocha': `temp.test.${timestamp}.js`,
        'javascript-jasmine': `temp.test.${timestamp}.js`,
        'typescript-jest': `temp.test.${timestamp}.ts`,
        'typescript-mocha': `temp.test.${timestamp}.ts`,
        'typescript-vitest': `temp.test.${timestamp}.ts`,
        'python-pytest': `test_temp_${timestamp}.py`,
        'python-unittest': `test_temp_${timestamp}.py`,
        'java-junit': `TempTest${timestamp}.java`,
        'java-testng': `TempTest${timestamp}.java`,
        'go-testing': `temp_test_${timestamp}.go`,
        'rust-cargo': `temp_test_${timestamp}.rs`,
        'cpp-gtest': `temp_test_${timestamp}.cpp`,
        'cpp-catch2': `temp_test_${timestamp}.cpp`,
        'csharp-nunit': `TempTest${timestamp}.cs`,
        'csharp-xunit': `TempTest${timestamp}.cs`,
        'ruby-rspec': `temp_spec_${timestamp}.rb`,
        'ruby-minitest': `temp_test_${timestamp}.rb`,
        'php-phpunit': `TempTest${timestamp}.php`
    };
    
    const key = `${language}-${framework}`;
    return fileNames[key] || `temp_test_${timestamp}.txt`;
}

/**
 * Get the appropriate test command based on language and framework
 */
function getTestCommand(language: string, framework: string, fileName: string): string | null {
    const commands: { [key: string]: string } = {
        // JavaScript/TypeScript - Use Jest with explicit config and rootDir
        'javascript-jest': `npx jest --config=jest.config.js --rootDir=. ${fileName}`,
        'javascript-mocha': `npx mocha ${fileName}`,
        'javascript-jasmine': `npx jasmine ${fileName}`,
        'typescript-jest': `npx jest --config=jest.config.js --rootDir=. ${fileName}`,
        'typescript-mocha': `npx ts-mocha ${fileName}`,
        'typescript-vitest': `npx vitest run ${fileName}`,
        
        // Python
        'python-pytest': `python -m pytest ./${fileName} -v`,
        'python-unittest': `python -m unittest ${fileName}`,
        
        // Java - Using Maven
        'java-junit': `mvn test -Dtest=${fileName.replace('.java', '')}`,
        'java-testng': `mvn test -Dtest=${fileName.replace('.java', '')}`,
        
        // Go
        'go-testing': `go test ./${fileName} -v`,
        
        // Rust
        'rust-cargo': `cargo test --test ${fileName.replace('.rs', '')}`,
        
        // C++
        'cpp-gtest': `g++ ${fileName} -lgtest -lgtest_main -pthread && ./a.out`,
        'cpp-catch2': `g++ ${fileName} -o test && ./test`,
        
        // C#
        'csharp-nunit': `dotnet test ${fileName}`,
        'csharp-xunit': `dotnet test ${fileName}`,
        
        // Ruby
        'ruby-rspec': `rspec ./${fileName}`,
        'ruby-minitest': `ruby ./${fileName}`,
        
        // PHP
        'php-phpunit': `phpunit ./${fileName}`
    };
    
    const key = `${language}-${framework}`;
    return commands[key] || null;
}

/**
 * Check if testing framework is installed in the project
 */
async function checkFrameworkInstalled(framework: string): Promise<boolean> {
    console.log(`[Framework Check] Checking if ${framework} is installed...`);
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        console.log('[Framework Check] No workspace folder found');
        return false;
    }

    try {
        // Check package.json for JavaScript/TypeScript
        if (['jest', 'mocha', 'jasmine', 'vitest'].includes(framework)) {
            const packageJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
            try {
                const packageJsonContent = await vscode.workspace.fs.readFile(packageJsonPath);
                const packageJson = JSON.parse(packageJsonContent.toString());
                
                const allDeps = {
                    ...packageJson.dependencies,
                    ...packageJson.devDependencies
                };
                
                const installed = framework in allDeps || `@types/${framework}` in allDeps;
                console.log(`[Framework Check] ${framework} in package.json: ${installed}`);
                return installed;
            } catch {
                return false;
            }
        }
        
        // Check pytest by running command (check if executable exists)
        if (framework === 'pytest') {
            console.log('[Framework Check] Checking pytest installation...');
            try {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                
                // Use 'python -m pytest' instead of 'pytest' to avoid PATH issues
                const { stdout } = await execAsync('python -m pytest --version');
                console.log('[Framework Check] pytest --version output:', stdout);
                console.log('[Framework Check] pytest IS installed ✓');
                return true; // pytest is installed and executable
            } catch (error: any) {
                console.log('[Framework Check] pytest command failed:', error.message);
                // Also check requirements.txt as fallback
                const requirementsPath = vscode.Uri.joinPath(workspaceFolder.uri, 'requirements.txt');
                try {
                    const requirementsContent = await vscode.workspace.fs.readFile(requirementsPath);
                    const installed = requirementsContent.toString().includes('pytest');
                    console.log('[Framework Check] pytest in requirements.txt:', installed);
                    return installed;
                } catch {
                    console.log('[Framework Check] No requirements.txt found');
                    return false;
                }
            }
        }
        
        // Check pom.xml for Java/Maven
        if (framework === 'junit') {
            console.log('[Framework Check] Checking JUnit/Maven installation...');
            
            // First check if Maven is installed
            try {
                const { exec } = require('child_process');
                const { promisify } = require('util');
                const execAsync = promisify(exec);
                
                await execAsync('mvn -version');
                console.log('[Framework Check] Maven is installed ✓');
                
                // Now check if pom.xml exists with JUnit
                const pomPath = vscode.Uri.joinPath(workspaceFolder.uri, 'pom.xml');
                try {
                    const pomContent = await vscode.workspace.fs.readFile(pomPath);
                    const hasJunit = pomContent.toString().includes('junit');
                    console.log('[Framework Check] JUnit in pom.xml:', hasJunit);
                    return hasJunit;
                } catch {
                    console.log('[Framework Check] No pom.xml found');
                    return false;
                }
            } catch (error: any) {
                console.log('[Framework Check] Maven not installed:', error.message);
                return false;
            }
        }
        
        // For other frameworks, assume installed
        return true;
        
    } catch {
        return false;
    }
}

/**
 * Install testing framework
 */
async function installFramework(framework: string): Promise<void> {
    // Special handling for JUnit - check Maven first
    if (framework === 'junit') {
        try {
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            
            await execAsync('mvn -version');
            // Maven is installed, proceed with installation
            const terminal = vscode.window.createTerminal('Install JUnit');
            terminal.show();
            terminal.sendText('mvn clean install');
            vscode.window.showInformationMessage('Installing JUnit dependencies...');
        } catch {
            // Maven not installed
            const action = await vscode.window.showErrorMessage(
                'Maven is not installed. Java testing requires JDK 11+ and Maven.',
                'View Setup Guide',
                'Cancel'
            );
            
            if (action === 'View Setup Guide') {
                const setupDoc = vscode.Uri.file(vscode.workspace.workspaceFolders?.[0].uri.fsPath + '/javasetup.md');
                try {
                    const doc = await vscode.workspace.openTextDocument(setupDoc);
                    await vscode.window.showTextDocument(doc);
                } catch {
                    vscode.window.showWarningMessage('Setup guide not found. Please install JDK 11+ and Maven manually.');
                }
            }
        }
        return;
    }
    
    // For other frameworks
    const terminal = vscode.window.createTerminal('Install Test Framework');
    terminal.show();
    
    const installCommands: { [key: string]: string } = {
        'jest': 'npm install --save-dev jest',
        'mocha': 'npm install --save-dev mocha',
        'jasmine': 'npm install --save-dev jasmine',
        'vitest': 'npm install --save-dev vitest',
        'pytest': 'pip install pytest'
    };
    
    const command = installCommands[framework];
    if (command) {
        terminal.sendText(command);
        vscode.window.showInformationMessage(`Installing ${framework}...`);
    } else {
        vscode.window.showWarningMessage(`Auto-installation not available for ${framework}. Please install manually.`);
    }
}

/**
 * Enhanced run tests with framework check
 */
async function runTestsWithFrameworkCheck(
    testCode: string,
    language: string,
    framework: string
): Promise<void> {
    // Check if framework is installed
    const isInstalled = await checkFrameworkInstalled(framework);
    
    if (!isInstalled) {
        const install = await vscode.window.showWarningMessage(
            `${framework} is not installed in this project. Would you like to install it?`,
            'Install', 'Run Anyway', 'Cancel'
        );
        
        if (install === 'Install') {
            await installFramework(framework);
            vscode.window.showInformationMessage(`Please wait for ${framework} to install, then try running tests again.`);
            return;
        } else if (install === 'Cancel') {
            return;
        }
        // If 'Run Anyway', proceed below
    }
    
    // Ask user which method to use
    const method = await vscode.window.showQuickPick(
        [
            { label: 'Terminal', description: 'Run tests in integrated terminal (real-time output)' },
            { label: 'Output Panel', description: 'Run tests and show results in output panel' }
        ],
        {
            placeHolder: 'Choose how to run tests'
        }
    );
    
    if (!method) {
        return;
    }
    
    // Proceed with running tests
    if (method.label === 'Terminal') {
        await runTestsInTerminal(testCode, language, framework);
    } else {
        await runTestsWithOutput(testCode, language, framework);
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
