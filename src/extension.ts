/**
 * AI Test Case Generator - Main Extension Entry Point
 * 
 * This extension automatically generates comprehensive test cases for code
 * using AI (Anthropic Claude or Google Gemini).
 */

import * as vscode from 'vscode';
import { getConfig, getApiKey, promptForApiKey, storeApiKey } from './config';
import { getLanguageFromDocument, showLanguageSelector, validateCode } from './languageDetector';
import { generateTests } from './testCaseGenerator';
import { createTestCasePanel, cleanupTempFiles } from './webviewProvider';
import { registerSidebarView } from './sidebarProvider';
import type { SupportedLanguage } from './types';

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Test Case Generator extension is now active');

    // Register sidebar view
    const sidebarProvider = registerSidebarView(context);

    // Register main command: Generate Test Cases
    const generateCommand = vscode.commands.registerCommand(
        'testcase-generator.generate',
        async () => {
            await handleGenerateTests(context);
        }
    );

    // Register command: Configure API Key
    const configureCommand = vscode.commands.registerCommand(
        'testcase-generator.configure',
        async () => {
            await handleConfigureApiKey(context);
        }
    );

    // Register command: Generate from Selection
    const generateFromSelectionCommand = vscode.commands.registerCommand(
        'testcase-generator.generateFromSelection',
        async () => {
            await handleGenerateFromSelection(context);
        }
    );

    context.subscriptions.push(generateCommand, configureCommand, generateFromSelectionCommand);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage(context);
        context.globalState.update('hasShownWelcome', true);
    }
}

/**
 * Handle Generate Test Cases command
 */
async function handleGenerateTests(context: vscode.ExtensionContext) {
    try {
        // 1. Get active editor
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Please open a file first.');
            return;
        }

        // 2. Get code from editor
        const document = editor.document;
        const code = document.getText();

        if (!code || code.trim().length === 0) {
            vscode.window.showErrorMessage('The file is empty. Please write some code first.');
            return;
        }

        // 3. Detect or select language
        let language: SupportedLanguage | null = getLanguageFromDocument(document);

        if (!language) {
            const selected = await showLanguageSelector();
            if (!selected) {
                return; // User cancelled
            }
            language = selected;
        }

        // 4. Validate code
        const validation = validateCode(code, language);
        if (!validation.valid) {
            const proceed = await vscode.window.showWarningMessage(
                `Code validation warning: ${validation.error}. Continue anyway?`,
                'Yes', 'No'
            );
            if (proceed !== 'Yes') {
                return;
            }
        }

        // 5. Get configuration
        const config = await getConfig(context);

        // 6. Check API key
        let apiKey = await getApiKey(context, config.apiProvider);
        if (!apiKey) {
            const key = await promptForApiKey(context, config.apiProvider);
            if (!key) {
                vscode.window.showErrorMessage(
                    'API key is required. Please configure your API key using the "Configure API Key" command.'
                );
                return;
            }
            apiKey = key;
        }
        config.apiKey = apiKey;

        // 7. Show progress and generate tests
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Generating test cases...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 0, message: 'Analyzing code...' });

                try {
                    // Generate tests
                    progress.report({ increment: 30, message: `Calling ${config.apiProvider === 'anthropic' ? 'Claude' : 'Gemini'}...` });
                    const tests = await generateTests(code, language as SupportedLanguage, config);

                    progress.report({ increment: 60, message: 'Processing results...' });

                    // 8. Show results in WebView panel
                    createTestCasePanel(context, tests, code, config);

                    progress.report({ increment: 100, message: 'Done!' });

                    vscode.window.showInformationMessage(
                        `✅ Generated ${tests.testCases.length} test cases successfully!`
                    );

                } catch (error: any) {
                    vscode.window.showErrorMessage(
                        `Failed to generate tests: ${error.message}`
                    );
                    console.error('Test generation error:', error);
                }
            }
        );

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
        console.error('Extension error:', error);
    }
}

/**
 * Handle Generate from Selection command
 */
async function handleGenerateFromSelection(context: vscode.ExtensionContext) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor. Please open a file first.');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showInformationMessage('No code selected. Generating tests for entire file...');
            await handleGenerateTests(context);
            return;
        }

        // Get selected code
        const code = editor.document.getText(selection);
        if (!code || code.trim().length === 0) {
            vscode.window.showErrorMessage('Selected code is empty.');
            return;
        }

        // Detect language
        let language: SupportedLanguage | null = getLanguageFromDocument(editor.document);
        if (!language) {
            const selected = await showLanguageSelector();
            if (!selected) {
                return;
            }
            language = selected;
        }

        // Get configuration
        const config = await getConfig(context);

        // Check API key
        let apiKey = await getApiKey(context, config.apiProvider);
        if (!apiKey) {
            const key = await promptForApiKey(context, config.apiProvider);
            if (!key) {
                vscode.window.showErrorMessage('API key is required.');
                return;
            }
            apiKey = key;
        }
        config.apiKey = apiKey;

        // Generate tests with progress
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Generating test cases for selection...',
                cancellable: false
            },
            async (progress) => {
                progress.report({ increment: 30 });
                const tests = await generateTests(code, language as SupportedLanguage, config);
                progress.report({ increment: 60 });
                createTestCasePanel(context, tests, code, config);
                progress.report({ increment: 100 });
                vscode.window.showInformationMessage(`✅ Generated ${tests.testCases.length} test cases!`);
            }
        );

    } catch (error: any) {
        vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
}

/**
 * Handle Configure API Key command
 */
async function handleConfigureApiKey(context: vscode.ExtensionContext) {
    try {
        // Ask which provider
        const provider = await vscode.window.showQuickPick(
            [
                { label: 'Anthropic Claude', value: 'anthropic', description: 'Use Claude for test generation' },
                { label: 'Google Gemini', value: 'gemini', description: 'Use Gemini for test generation' }
            ],
            {
                placeHolder: 'Select AI provider',
                ignoreFocusOut: true
            }
        );

        if (!provider) {
            return;
        }

        const providerKey = provider.value as 'anthropic' | 'gemini';

        // Prompt for API key
        const apiKey = await vscode.window.showInputBox({
            prompt: `Enter your ${provider.label} API key`,
            password: true,
            placeHolder: providerKey === 'anthropic' ? 'sk-ant-...' : 'AI...',
            ignoreFocusOut: true,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'API key cannot be empty';
                }
                if (providerKey === 'anthropic' && !value.startsWith('sk-ant-')) {
                    return 'Anthropic API key should start with "sk-ant-"';
                }
                return null;
            }
        });

        if (!apiKey) {
            return;
        }

        // Store API key
        await storeApiKey(context, providerKey, apiKey);

        // Update configuration if different from current
        const config = vscode.workspace.getConfiguration('testCaseGenerator');
        if (config.get('apiProvider') !== providerKey) {
            const updateConfig = await vscode.window.showInformationMessage(
                `Set ${provider.label} as default provider?`,
                'Yes', 'No'
            );
            if (updateConfig === 'Yes') {
                await config.update('apiProvider', providerKey, vscode.ConfigurationTarget.Global);
            }
        }

        vscode.window.showInformationMessage(`✅ ${provider.label} API key saved successfully!`);

    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to save API key: ${error.message}`);
    }
}

/**
 * Show welcome message
 */
function showWelcomeMessage(context: vscode.ExtensionContext) {
    const message = 'Welcome to AI Test Case Generator! Configure your API key to get started.';
    vscode.window.showInformationMessage(
        message,
        'Configure API Key',
        'Learn More'
    ).then(selection => {
        if (selection === 'Configure API Key') {
            vscode.commands.executeCommand('testcase-generator.configure');
        } else if (selection === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/yourusername/ai-testcase-generator'));
        }
    });
}

/**
 * Extension deactivation
 */
export function deactivate() {
    console.log('AI Test Case Generator extension is now deactivating');
    
    // Cleanup any remaining temp test files
    cleanupTempFiles().then(() => {
        console.log('Temp file cleanup complete');
    }).catch((error) => {
        console.error('Error during temp file cleanup:', error);
    });
}
