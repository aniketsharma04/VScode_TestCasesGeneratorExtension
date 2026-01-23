/**
 * Language detection and code parsing utilities
 */

import * as vscode from 'vscode';
import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { SupportedLanguage, CodeBlock, FunctionSignature, Parameter, ValidationResult } from './types';

/**
 * Language ID mapping to supported languages
 */
const LANGUAGE_MAP: { [key: string]: SupportedLanguage } = {
    'javascript': 'javascript',
    'javascriptreact': 'javascript',
    'typescript': 'typescript',
    'typescriptreact': 'typescript',
    'python': 'python',
    'java': 'java',
    'go': 'go',
    'rust': 'rust',
    'cpp': 'cpp',
    'c': 'cpp',
    'csharp': 'csharp',
    'ruby': 'ruby',
    'php': 'php'
};

/**
 * Get language from active VS Code document
 */
export function getLanguageFromDocument(document: vscode.TextDocument): SupportedLanguage | null {
    const languageId = document.languageId;
    return LANGUAGE_MAP[languageId] || null;
}

/**
 * Show quick pick menu for manual language selection
 */
export async function showLanguageSelector(): Promise<SupportedLanguage | undefined> {
    const languages: { label: string; value: SupportedLanguage }[] = [
        { label: 'JavaScript', value: 'javascript' },
        { label: 'TypeScript', value: 'typescript' },
        { label: 'Python', value: 'python' },
        { label: 'Java', value: 'java' },
        { label: 'Go', value: 'go' },
        { label: 'Rust', value: 'rust' },
        { label: 'C++', value: 'cpp' },
        { label: 'C#', value: 'csharp' },
        { label: 'Ruby', value: 'ruby' },
        { label: 'PHP', value: 'php' }
    ];
    
    const selected = await vscode.window.showQuickPick(
        languages.map(l => ({ label: l.label, description: l.value })),
        {
            placeHolder: 'Select the programming language',
            ignoreFocusOut: true
        }
    );
    
    if (selected) {
        const lang = languages.find(l => l.label === selected.label);
        return lang?.value;
    }
    
    return undefined;
}

/**
 * Extract functions/methods from code using AST parsing
 */
export function extractCodeBlocks(code: string, language: SupportedLanguage): CodeBlock[] {
    try {
        if (language === 'javascript' || language === 'typescript') {
            return extractJavaScriptBlocks(code);
        } else if (language === 'python') {
            return extractPythonBlocks(code);
        } else {
            // For other languages, return the whole code as one block
            return [{
                type: 'function',
                name: 'code',
                code: code,
                startLine: 1,
                endLine: code.split('\n').length
            }];
        }
    } catch (error) {
        console.error('Error extracting code blocks:', error);
        return [];
    }
}

/**
 * Extract JavaScript/TypeScript code blocks using Babel
 */
function extractJavaScriptBlocks(code: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    
    try {
        const ast = parser.parse(code, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx', 'decorators-legacy']
        });
        
        traverse(ast, {
            FunctionDeclaration(path) {
                if (path.node.id) {
                    const startLine = path.node.loc?.start.line || 0;
                    const endLine = path.node.loc?.end.line || 0;
                    
                    blocks.push({
                        type: 'function',
                        name: path.node.id.name,
                        code: code.substring(path.node.start || 0, path.node.end || 0),
                        startLine,
                        endLine,
                        params: path.node.params.map(p => t.isIdentifier(p) ? p.name : 'param')
                    });
                }
            },
            ClassMethod(path) {
                if (t.isIdentifier(path.node.key)) {
                    const startLine = path.node.loc?.start.line || 0;
                    const endLine = path.node.loc?.end.line || 0;
                    
                    blocks.push({
                        type: 'method',
                        name: path.node.key.name,
                        code: code.substring(path.node.start || 0, path.node.end || 0),
                        startLine,
                        endLine,
                        params: path.node.params.map(p => t.isIdentifier(p) ? p.name : 'param')
                    });
                }
            },
            ArrowFunctionExpression(path) {
                // Only capture named arrow functions
                if (path.parent && t.isVariableDeclarator(path.parent) && t.isIdentifier(path.parent.id)) {
                    const startLine = path.node.loc?.start.line || 0;
                    const endLine = path.node.loc?.end.line || 0;
                    
                    blocks.push({
                        type: 'function',
                        name: path.parent.id.name,
                        code: code.substring(path.node.start || 0, path.node.end || 0),
                        startLine,
                        endLine,
                        params: path.node.params.map(p => t.isIdentifier(p) ? p.name : 'param')
                    });
                }
            }
        });
    } catch (error) {
        console.error('Babel parsing error:', error);
    }
    
    return blocks;
}

/**
 * Extract Python code blocks using regex
 */
function extractPythonBlocks(code: string): CodeBlock[] {
    const blocks: CodeBlock[] = [];
    const lines = code.split('\n');
    
    // Regex for Python functions and methods
    const functionRegex = /^\s*(def|async\s+def)\s+(\w+)\s*\((.*?)\)\s*(?:->\s*(.+?))?\s*:/;
    
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(functionRegex);
        if (match) {
            const name = match[2];
            const params = match[3].split(',').map(p => p.trim().split(':')[0].trim()).filter(p => p);
            const returnType = match[4]?.trim();
            
            // Find the end of the function (next function or class, or end of file)
            let endLine = i + 1;
            const indent = lines[i].search(/\S/);
            
            for (let j = i + 1; j < lines.length; j++) {
                const line = lines[j];
                if (line.trim() && line.search(/\S/) <= indent && !line.trim().startsWith('#')) {
                    endLine = j - 1;
                    break;
                }
                endLine = j;
            }
            
            blocks.push({
                type: 'function',
                name,
                code: lines.slice(i, endLine + 1).join('\n'),
                startLine: i + 1,
                endLine: endLine + 1,
                params,
                returnType
            });
        }
    }
    
    return blocks;
}

/**
 * Detect which testing framework is already in use in the project
 */
export async function detectExistingFramework(
    language: SupportedLanguage, 
    workspaceRoot: string
): Promise<string | null> {
    try {
        const workspaceUri = vscode.Uri.file(workspaceRoot);
        
        if (language === 'javascript' || language === 'typescript') {
            // Check package.json
            const packageJsonUri = vscode.Uri.joinPath(workspaceUri, 'package.json');
            try {
                const content = await vscode.workspace.fs.readFile(packageJsonUri);
                const packageJson = JSON.parse(content.toString());
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                if (deps.jest || deps['@types/jest']) return 'jest';
                if (deps.mocha || deps['@types/mocha']) return 'mocha';
                if (deps.vitest) return 'vitest';
                if (deps.jasmine) return 'jasmine';
            } catch {
                // File doesn't exist
            }
        } else if (language === 'python') {
            // Check requirements.txt or Pipfile
            const requirementsUri = vscode.Uri.joinPath(workspaceUri, 'requirements.txt');
            try {
                const content = await vscode.workspace.fs.readFile(requirementsUri);
                const text = content.toString();
                if (text.includes('pytest')) return 'pytest';
                if (text.includes('unittest')) return 'unittest';
            } catch {
                // File doesn't exist
            }
        } else if (language === 'java') {
            // Check pom.xml for JUnit/TestNG
            const pomUri = vscode.Uri.joinPath(workspaceUri, 'pom.xml');
            try {
                const content = await vscode.workspace.fs.readFile(pomUri);
                const text = content.toString();
                if (text.includes('junit-jupiter')) return 'junit';
                if (text.includes('testng')) return 'testng';
            } catch {
                // File doesn't exist
            }
        }
    } catch (error) {
        console.error('Error detecting framework:', error);
    }
    
    return null;
}

/**
 * Parse code to get function signatures
 */
export function parseFunctionSignatures(code: string, language: SupportedLanguage): FunctionSignature[] {
    const blocks = extractCodeBlocks(code, language);
    const signatures: FunctionSignature[] = [];
    
    for (const block of blocks) {
        if (block.type === 'function' || block.type === 'method') {
            signatures.push({
                name: block.name,
                parameters: (block.params || []).map(p => ({
                    name: p,
                    type: block.returnType,
                    optional: false
                })),
                returnType: block.returnType || 'void',
                isAsync: block.code.includes('async')
            });
        }
    }
    
    return signatures;
}

/**
 * Check if code is valid/parseable
 */
export function validateCode(code: string, language: SupportedLanguage): ValidationResult {
    if (!code || code.trim().length === 0) {
        return {
            valid: false,
            error: 'Code is empty'
        };
    }
    
    try {
        if (language === 'javascript' || language === 'typescript') {
            // Try to parse with Babel
            parser.parse(code, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx', 'decorators-legacy']
            });
        }
        
        // For other languages, just check it's not empty
        return { valid: true };
    } catch (error: any) {
        return {
            valid: false,
            error: `Parse error: ${error.message || 'Unknown error'}`
        };
    }
}
