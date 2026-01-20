/**
 * AI-powered test case generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtensionConfig, GeneratedTests, SupportedLanguage, TestCase } from './types';

/**
 * Main function to generate tests using configured AI provider
 */
export async function generateTests(
    code: string,
    language: SupportedLanguage,
    config: ExtensionConfig,
    framework?: string
): Promise<GeneratedTests> {
    // Determine framework if not provided
    const testFramework = framework || getDefaultFramework(language);
    
    let aiResponse: string;
    
    try {
        // Generate tests based on provider
        if (config.apiProvider === 'anthropic') {
            aiResponse = await generateWithClaude(code, language, testFramework, config);
        } else {
            aiResponse = await generateWithGemini(code, language, testFramework, config);
        }
        
        // Parse the response
        const tests = parseTestCases(aiResponse, language, testFramework);
        
        // Validate generated tests
        const validation = validateGeneratedTests(tests);
        if (!validation.valid) {
            console.warn('Generated tests have issues:', validation.issues);
        }
        
        return tests;
    } catch (error: any) {
        console.error('Test generation error:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Full error:', JSON.stringify(error, null, 2));
        
        // Provide user-friendly error messages
        if (error.status === 401 || error.message?.includes('401')) {
            throw new Error('Invalid API key. Please configure your API key using the "Configure API Key" command.');
        } else if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
            throw new Error('API rate limit exceeded. Please try again later or check your API quota at https://ai.dev/rate-limit');
        } else if (error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded')) {
            throw new Error('Gemini servers are overloaded. Please wait a few seconds and try again. (Error 503)');
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
        } else if (error.message?.includes('API key') || error.message?.includes('API_KEY_INVALID')) {
            throw new Error('Invalid API key. Please reconfigure your API key.');
        } else {
            throw new Error(`Failed to generate tests: ${error.message || 'Unknown error'}`);
        }
    }
}

/**
 * Generate tests using Anthropic Claude
 */
async function generateWithClaude(
    code: string,
    language: string,
    framework: string,
    config: ExtensionConfig
): Promise<string> {
    const anthropic = new Anthropic({
        apiKey: config.apiKey
    });
    
    const prompt = buildTestPrompt(code, language, framework);
    
    const message = await anthropic.messages.create({
        model: config.model || 'claude-sonnet-4-20250514',
        max_tokens: config.maxTokens || 4096,
        temperature: config.temperature || 0.7,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ]
    });
    
    // Extract text from response
    const textContent = message.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
    }
    
    return textContent.text;
}

/**
 * Generate tests using Google Gemini
 */
async function generateWithGemini(
    code: string,
    language: string,
    framework: string,
    config: ExtensionConfig
): Promise<string> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || 'gemini-2.5-flash',
        generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 4096,
        }
    });
    
    const prompt = buildTestPrompt(code, language, framework);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Build optimized prompt for test generation
 */
function buildTestPrompt(code: string, language: string, framework: string): string {
    const languageSpecificInstructions = getLanguageSpecificInstructions(language, framework);
    
    return `You are an expert software testing engineer. Generate comprehensive, RUNNABLE unit tests for the following ${language} code.

CODE TO TEST:
\`\`\`${language}
${code}
\`\`\`

CRITICAL REQUIREMENTS FOR ${framework.toUpperCase()}:
1. **Import ALL dependencies ONLY ONCE at the very top** - DO NOT repeat imports
2. **${languageSpecificInstructions.wrapperRequirement}**
3. **Use correct module path** - ${languageSpecificInstructions.importExample}
4. **Generate 5-8 different test cases covering:**
   - Normal scenarios (2-3 tests)
   - Edge cases (boundary values, empty, null) (2-3 tests)
   - Error cases (invalid inputs, exceptions) (1-2 tests)
5. **Each test must be independent and runnable**
6. **Use proper ${framework} syntax and matchers**
7. **${languageSpecificInstructions.organizationTip}**

${languageSpecificInstructions.exampleCode}

CRITICAL:
- ${languageSpecificInstructions.importRule}
- ${languageSpecificInstructions.structureRule}
- NO explanatory text before/after code
- COMPLETE, RUNNABLE code only
- ${languageSpecificInstructions.matcherInfo}

Generate the tests now:`;
}

/**
 * Get language-specific instructions for test generation
 */
function getLanguageSpecificInstructions(language: string, framework: string): {
    wrapperRequirement: string;
    importExample: string;
    organizationTip: string;
    exampleCode: string;
    importRule: string;
    structureRule: string;
    matcherInfo: string;
} {
    const instructions: { [key: string]: any } = {
        'javascript': {
            wrapperRequirement: 'Wrap all tests in a single describe() block',
            importExample: 'If testing example.js, use require(\'./example\')',
            organizationTip: 'Use nested describe blocks for better organization',
            exampleCode: `EXACT STRUCTURE (Jest example):
\`\`\`javascript
const { add, divide, findMax } = require('./example');

describe('Example Functions', () => {
  describe('add function', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
  
  describe('divide function', () => {
    test('should throw error on division by zero', () => {
      expect(() => divide(5, 0)).toThrow();
    });
  });
});
\`\`\``,
            importRule: 'ONE import/require statement at top',
            structureRule: 'ONE main describe block wrapping everything',
            matcherInfo: 'Use appropriate matchers: .toBe(), .toEqual(), .toThrow(), .toBeNull()'
        },
        'typescript': {
            wrapperRequirement: 'Wrap all tests in a single describe() block',
            importExample: 'If testing example.ts, use import { add } from \'./example\'',
            organizationTip: 'Use nested describe blocks for better organization',
            exampleCode: `EXACT STRUCTURE (Jest/TypeScript example):
\`\`\`typescript
import { add, divide, findMax } from './example';

describe('Example Functions', () => {
  describe('add function', () => {
    test('should add two positive numbers', () => {
      expect(add(2, 3)).toBe(5);
    });
  });
});
\`\`\``,
            importRule: 'ONE import statement at top',
            structureRule: 'ONE main describe block wrapping everything',
            matcherInfo: 'Use appropriate matchers: .toBe(), .toEqual(), .toThrow()'
        },
        'python': {
            wrapperRequirement: 'Wrap all tests in a test class or use separate test functions',
            importExample: 'If testing example.py, use from example import add, divide',
            organizationTip: 'Group related tests in test classes',
            exampleCode: `EXACT STRUCTURE (Pytest example):
\`\`\`python
from example import add, divide, find_max
import pytest

class TestCalculator:
    def test_add_positive_numbers(self):
        assert add(2, 3) == 5
    
    def test_add_negative_numbers(self):
        assert add(-1, -2) == -3
    
    def test_divide_normal(self):
        assert divide(6, 3) == 2
    
    def test_divide_by_zero_raises_error(self):
        with pytest.raises(ValueError):
            divide(5, 0)
    
    def test_find_max_normal(self):
        assert find_max([1, 5, 3]) == 5
\`\`\``,
            importRule: 'ONE import statement at top: from module import functions',
            structureRule: 'Use test class or separate test functions with test_ prefix',
            matcherInfo: 'Use assert statements and pytest.raises() for exceptions'
        },
        'java': {
            wrapperRequirement: 'Create a test class with @Test methods (JUnit 5)',
            importExample: 'If testing Calculator.java, import com.testcase.Calculator',
            organizationTip: 'Use @Test annotation for each test method',
            exampleCode: `EXACT STRUCTURE (JUnit 5 example):
\`\`\`java
package com.testcase;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    public void testAdd() {
        assertEquals(5, Calculator.add(2, 3));
    }
    
    @Test
    public void testAddNegative() {
        assertEquals(-3, Calculator.add(-1, -2));
    }
    
    @Test
    public void testDivide() {
        assertEquals(2.0, Calculator.divide(6, 3), 0.001);
    }
    
    @Test
    public void testDivideByZeroThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.divide(5, 0);
        });
    }
    
    @Test
    public void testFindMax() {
        assertEquals(5, Calculator.findMax(new int[]{1, 5, 3}));
    }
}
\`\`\``,
            importRule: 'Import JUnit 5 classes (org.junit.jupiter.api.*) and class under test',
            structureRule: 'Create test class with @Test methods, use assertThrows() for exceptions',
            matcherInfo: 'Use assertEquals(), assertTrue(), assertFalse(), assertThrows(), assertNull()'
        }
    };
    
    return instructions[language] || instructions['javascript'];
}

/**
 * Clean and validate generated test code
 */
function cleanGeneratedTests(rawCode: string, language: string): string {
    let cleaned = rawCode;
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\w]*\n?/g, '').trim();
    
    if (language === 'javascript' || language === 'typescript') {
        // Fix duplicate imports - keep only first occurrence
        const lines = cleaned.split('\n');
        const imports = new Set<string>();
        const importLines: string[] = [];
        const codeLines: string[] = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check if it's an import/require line
            if ((trimmed.startsWith('const ') || trimmed.startsWith('import ')) && 
                (trimmed.includes('require(') || trimmed.includes('from '))) {
                
                // Normalize whitespace for comparison
                const normalized = trimmed.replace(/\s+/g, ' ');
                
                // Only add if we haven't seen this import before
                if (!imports.has(normalized)) {
                    imports.add(normalized);
                    importLines.push(line);
                }
            } else if (trimmed) {
                codeLines.push(line);
            }
        }
        
        // Reconstruct: imports first, then other code
        cleaned = [...importLines, '', ...codeLines].join('\n');
        
        // Ensure all tests are wrapped in describe block if missing
        if (!cleaned.includes('describe(')) {
            const hasTests = cleaned.includes('test(') || cleaned.includes('it(');
            if (hasTests) {
                const withoutImports = codeLines.join('\n');
                cleaned = [
                    ...importLines,
                    '',
                    "describe('Generated Tests', () => {",
                    ...withoutImports.split('\n').map(l => l ? '  ' + l : ''),
                    '});'
                ].join('\n');
            }
        }
    } else if (language === 'python') {
        // Fix duplicate imports for Python
        const lines = cleaned.split('\n');
        const imports = new Set<string>();
        const importLines: string[] = [];
        const codeLines: string[] = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check if it's an import line
            if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                const normalized = trimmed.replace(/\s+/g, ' ');
                
                if (!imports.has(normalized)) {
                    imports.add(normalized);
                    importLines.push(line);
                }
            } else if (trimmed) {
                codeLines.push(line);
            }
        }
        
        // Reconstruct: imports first, then other code
        cleaned = [...importLines, '', ...codeLines].join('\n');
    } else if (language === 'java') {
        // Fix duplicate imports for Java
        const lines = cleaned.split('\n');
        const imports = new Set<string>();
        const importLines: string[] = [];
        const codeLines: string[] = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Check if it's an import line
            if (trimmed.startsWith('import ')) {
                const normalized = trimmed.replace(/\s+/g, ' ');
                
                if (!imports.has(normalized)) {
                    imports.add(normalized);
                    importLines.push(line);
                }
            } else if (trimmed) {
                codeLines.push(line);
            }
        }
        
        // Reconstruct: imports first, then other code
        cleaned = [...importLines, '', ...codeLines].join('\n');
    }
    
    return cleaned;
}

/**
 * Parse AI response to extract test cases
 */
function parseTestCases(response: string, language: string, framework: string): GeneratedTests {
    // Clean the response first
    const cleanCode = cleanGeneratedTests(response, language);
    
    const lines = cleanCode.split('\n');
    let imports = '';
    const testCases: TestCase[] = [];
    
    // Extract imports based on language
    if (language === 'javascript' || language === 'typescript') {
        const importLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('import ') || 
                   trimmed.startsWith('const ') && trimmed.includes('require(') ||
                   trimmed.startsWith('require(');
        });
        imports = importLines.join('\n');
        
        // Extract individual test cases
        testCases.push(...extractJestTests(cleanCode, imports));
    } else if (language === 'python') {
        const importLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('import ') || trimmed.startsWith('from ');
        });
        imports = importLines.join('\n');
        
        // Extract individual test cases
        testCases.push(...extractPytestTests(cleanCode, imports));
    } else if (language === 'java') {
        const importLines = lines.filter(line => line.trim().startsWith('import '));
        imports = importLines.join('\n');
        
        testCases.push(...extractJUnitTests(cleanCode, imports));
    } else {
        // For other languages, treat whole code as one test
        testCases.push({
            id: generateId(),
            name: 'Generated Tests',
            code: cleanCode,
            type: 'normal',
            framework
        });
    }
    
    return {
        language,
        framework,
        testCases: testCases.length > 0 ? testCases : [{
            id: generateId(),
            name: 'Generated Tests',
            code: cleanCode,
            type: 'normal',
            framework
        }],
        imports,
        fullCode: cleanCode,
        timestamp: Date.now()
    };
}

/**
 * Extract individual Jest/Mocha test cases
 */
function extractJestTests(code: string, imports: string = ''): TestCase[] {
    const tests: TestCase[] = [];
    
    // Match test() or it() blocks with better regex
    const testRegex = /(?:test|it)\s*\(\s*['`"](.*?)['`"]\s*,\s*(?:async\s+)?\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\)/g;
    const matches = [...code.matchAll(testRegex)];
    
    for (const match of matches) {
        const testName = match[2];
        const startIndex = match.index || 0;
        
        // Find matching closing brace
        let braceCount = 1;
        let endIndex = startIndex + match[0].length;
        
        for (let i = endIndex; i < code.length && braceCount > 0; i++) {
            if (code[i] === '{') braceCount++;
            if (code[i] === '}') braceCount--;
            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
        
        // Handle the closing parenthesis and semicolon
        while (endIndex < code.length && (code[endIndex] === ')' || code[endIndex] === ';' || code[endIndex] === ' ' || code[endIndex] === '\n')) {
            if (code[endIndex] === ')' || code[endIndex] === ';') {
                endIndex++;
                break;
            }
            endIndex++;
        }
        
        const testCode = code.substring(startIndex, endIndex).trim();
        
        // Combine imports with test code for standalone execution
        const fullTestCode = imports ? `${imports}\n\n${testCode}` : testCode;
        
        tests.push({
            id: generateId(),
            name: testName,
            code: fullTestCode,
            type: determineTestType(testName),
            framework: 'jest'
        });
    }
    
    return tests;
}

/**
 * Extract Pytest test cases
 */
function extractPytestTests(code: string, imports: string = ''): TestCase[] {
    const tests: TestCase[] = [];
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/def\s+(test_\w+)\s*\(/);
        
        if (match) {
            const testName = match[1];
            const indent = line.search(/\S/);
            
            // Find the end of the function
            let endLine = i + 1;
            for (let j = i + 1; j < lines.length; j++) {
                const currentLine = lines[j];
                if (currentLine.trim() && currentLine.search(/\S/) <= indent && !currentLine.trim().startsWith('#')) {
                    endLine = j - 1;
                    break;
                }
                endLine = j;
            }
            
            const testCode = lines.slice(i, endLine + 1).join('\n');
            
            // Combine imports with test code
            const fullTestCode = imports ? `${imports}\n\n${testCode}` : testCode;
            
            tests.push({
                id: generateId(),
                name: testName,
                code: fullTestCode,
                type: determineTestType(testName),
                framework: 'pytest'
            });
        }
    }
    
    return tests;
}

/**
 * Extract JUnit test cases
 */
function extractJUnitTests(code: string, imports: string = ''): TestCase[] {
    const tests: TestCase[] = [];
    
    // Match @Test methods
    const testRegex = /@Test\s+(?:public\s+)?void\s+(\w+)\s*\(\s*\)\s*\{/g;
    const matches = [...code.matchAll(testRegex)];
    
    for (const match of matches) {
        const testName = match[1];
        const startIndex = match.index || 0;
        
        // Find matching closing brace
        let braceCount = 1;
        let endIndex = startIndex + match[0].length;
        
        for (let i = endIndex; i < code.length && braceCount > 0; i++) {
            if (code[i] === '{') braceCount++;
            if (code[i] === '}') braceCount--;
            if (braceCount === 0) {
                endIndex = i + 1;
                break;
            }
        }
        
        const testCode = code.substring(startIndex, endIndex).trim();
        
        // Combine imports with test code
        const fullTestCode = imports ? `${imports}\n\n${testCode}` : testCode;
        
        tests.push({
            id: generateId(),
            name: testName,
            code: fullTestCode,
            type: determineTestType(testName),
            framework: 'junit'
        });
    }
    
    return tests;
}

/**
 * Determine test type from test name
 */
function determineTestType(testName: string): 'normal' | 'edge' | 'error' {
    const lowerName = testName.toLowerCase();
    
    // Error/exception tests
    if (lowerName.includes('error') || 
        lowerName.includes('throw') || 
        lowerName.includes('fail') || 
        lowerName.includes('invalid') ||
        lowerName.includes('exception')) {
        return 'error';
    }
    
    // Edge case tests
    if (lowerName.includes('edge') || 
        lowerName.includes('boundary') || 
        lowerName.includes('empty') || 
        lowerName.includes('null') ||
        lowerName.includes('undefined') ||
        lowerName.includes('zero') ||
        lowerName.includes('negative') ||
        lowerName.includes('maximum') ||
        lowerName.includes('minimum')) {
        return 'edge';
    }
    
    // Normal tests
    return 'normal';
}

/**
 * Generate unique ID
 */
function generateId(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate generated tests for common issues
 */
function validateGeneratedTests(tests: GeneratedTests): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!tests.fullCode || tests.fullCode.trim().length === 0) {
        issues.push('Generated code is empty');
    }
    
    if (tests.testCases.length === 0) {
        issues.push('No test cases extracted');
    }
    
    // Check for common syntax issues
    const code = tests.fullCode;
    if (tests.language === 'javascript' || tests.language === 'typescript') {
        if (!code.includes('describe') && !code.includes('test') && !code.includes('it')) {
            issues.push('No test functions found');
        }
    }
    
    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Get default framework for language
 */
function getDefaultFramework(language: string): string {
    const frameworkMap: { [key: string]: string } = {
        'javascript': 'jest',
        'typescript': 'jest',
        'python': 'pytest',
        'java': 'junit',
        'go': 'testing',
        'rust': 'cargo test',
        'cpp': 'gtest',
        'csharp': 'nunit',
        'ruby': 'rspec',
        'php': 'phpunit'
    };
    
    return frameworkMap[language] || 'unknown';
}
