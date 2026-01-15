/**
 * Configuration management for the extension
 */

import * as vscode from 'vscode';
import type { ExtensionConfig, FrameworkMap } from './types';

/**
 * Framework mappings for each supported language
 */
const FRAMEWORK_MAP: FrameworkMap = {
    'javascript': ['jest', 'mocha', 'jasmine'],
    'typescript': ['jest', 'mocha', 'vitest'],
    'python': ['pytest', 'unittest'],
    'java': ['junit', 'testng'],
    'go': ['testing'],
    'rust': ['cargo test'],
    'cpp': ['gtest', 'catch2'],
    'csharp': ['nunit', 'xunit'],
    'ruby': ['rspec', 'minitest'],
    'php': ['phpunit']
};

/**
 * Get extension configuration from VS Code settings
 */
export async function getConfig(context: vscode.ExtensionContext): Promise<ExtensionConfig> {
    const config = vscode.workspace.getConfiguration('testCaseGenerator');
    
    const apiProvider = config.get<'anthropic' | 'gemini'>('apiProvider', 'gemini');
    const model = config.get<string>('model', apiProvider === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gemini-2.5-flash');
    const maxTokens = config.get<number>('maxTokens', 4096);
    const temperature = config.get<number>('temperature', 0.7);
    
    return {
        apiProvider,
        apiKey: '', // Will be loaded separately from secrets
        model,
        maxTokens,
        temperature
    };
}

/**
 * Get or prompt for API key from secure storage
 */
export async function getApiKey(
    context: vscode.ExtensionContext, 
    provider: 'anthropic' | 'gemini'
): Promise<string | undefined> {
    const key = await context.secrets.get(`${provider}-api-key`);
    return key;
}

/**
 * Store API key securely in VS Code secrets
 */
export async function storeApiKey(
    context: vscode.ExtensionContext, 
    provider: 'anthropic' | 'gemini', 
    apiKey: string
): Promise<void> {
    await context.secrets.store(`${provider}-api-key`, apiKey);
}

/**
 * Prompt user to configure API key if not set
 */
export async function promptForApiKey(
    context: vscode.ExtensionContext, 
    provider: 'anthropic' | 'gemini'
): Promise<string | undefined> {
    const providerName = provider === 'anthropic' ? 'Anthropic Claude' : 'Google Gemini';
    const placeholder = provider === 'anthropic' ? 'sk-ant-...' : 'AI...';
    
    const apiKey = await vscode.window.showInputBox({
        prompt: `Enter your ${providerName} API key`,
        password: true,
        placeHolder: placeholder,
        ignoreFocusOut: true,
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API key cannot be empty';
            }
            if (!validateApiKey(value, provider)) {
                if (provider === 'anthropic') {
                    return 'Anthropic API key should start with "sk-ant-"';
                }
            }
            return null;
        }
    });
    
    if (apiKey) {
        await storeApiKey(context, provider, apiKey);
        return apiKey;
    }
    
    return undefined;
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(apiKey: string, provider: 'anthropic' | 'gemini'): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
        return false;
    }
    
    if (provider === 'anthropic') {
        return apiKey.startsWith('sk-ant-');
    }
    
    // Gemini keys are more flexible, just check it's not empty and has reasonable length
    return apiKey.length > 10;
}

/**
 * Get default testing framework for a language
 */
export function getDefaultFramework(language: string): string {
    const frameworks = FRAMEWORK_MAP[language];
    return frameworks && frameworks.length > 0 ? frameworks[0] : 'unknown';
}

/**
 * Get all supported frameworks for a language
 */
export function getSupportedFrameworks(language: string): string[] {
    return FRAMEWORK_MAP[language] || [];
}

/**
 * Get the framework map
 */
export function getFrameworkMap(): FrameworkMap {
    return FRAMEWORK_MAP;
}
