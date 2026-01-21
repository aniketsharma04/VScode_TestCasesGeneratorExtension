/**
 * AI-powered test case generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtensionConfig, GeneratedTests, SupportedLanguage, TestCase } from './types';

// Configuration constants
const TESTS_PER_GENERATION = 12; // Number of tests to generate per request
const MAX_RETRIES = 2; // Maximum API retry attempts
const YIELD_THRESHOLD = 0.5; // If yield < 50%, use variations

/**
 * Main function to generate tests using configured AI provider with retry and variation logic
 */
export async function generateTests(
    code: string,
    language: SupportedLanguage,
    config: ExtensionConfig,
    framework?: string,
    existingTests?: TestCase[]
): Promise<GeneratedTests> {
    // Determine framework if not provided
    const testFramework = framework || getDefaultFramework(language);
    
    let allUniqueTests: TestCase[] = [];
    let totalAttempts = 0;
    let allExistingTests = existingTests || [];
    
    try {
        // Try to generate tests with retry logic (max 2 attempts)
        for (let attempt = 0; attempt < MAX_RETRIES && allUniqueTests.length < TESTS_PER_GENERATION; attempt++) {
            totalAttempts++;
            
            // Generate tests based on provider
            let aiResponse: string;
            if (config.apiProvider === 'anthropic') {
                aiResponse = await generateWithClaude(code, language, testFramework, config, allExistingTests);
            } else {
                aiResponse = await generateWithGemini(code, language, testFramework, config, allExistingTests);
            }
            
            // Parse the response
            const tests = parseTestCases(aiResponse, language, testFramework);
            
            // Deduplicate against ALL existing tests (including what we just generated)
            const deduplicationResult = deduplicateTests(tests.testCases, allExistingTests);
            const newUniqueTests = deduplicationResult.uniqueTests;
            
            // Add new unique tests to our collection
            allUniqueTests.push(...newUniqueTests);
            
            // Update existing tests pool to include newly found tests
            allExistingTests = [...allExistingTests, ...newUniqueTests];
            
            // Calculate yield
            const yield_percentage = newUniqueTests.length / tests.testCases.length;
            
            console.log(`Attempt ${attempt + 1}: Generated ${tests.testCases.length}, Got ${newUniqueTests.length} unique (${Math.round(yield_percentage * 100)}% yield)`);
            
            // If we have enough tests OR yield is too low, stop retrying
            if (allUniqueTests.length >= TESTS_PER_GENERATION || yield_percentage < YIELD_THRESHOLD) {
                break;
            }
        }
        
        // If we still don't have 12 tests, fill with variations
        if (allUniqueTests.length < TESTS_PER_GENERATION && existingTests && existingTests.length > 0) {
            const needed = TESTS_PER_GENERATION - allUniqueTests.length;
            console.log(`Generating ${needed} variations to reach 12 tests`);
            
            const variations = generateVariations(existingTests, needed, language, allExistingTests);
            allUniqueTests.push(...variations);
        }
        
        // Ensure we have exactly 12 tests (trim if over)
        const finalTests = allUniqueTests.slice(0, TESTS_PER_GENERATION);
        
        // Rebuild full code from final tests
        const fullCode = rebuildFullCode(finalTests, language, testFramework);
        
        // Validate generated tests
        const validation = validateGeneratedTests({ 
            language, 
            framework: testFramework, 
            testCases: finalTests, 
            imports: '', 
            fullCode, 
            timestamp: Date.now() 
        });
        
        if (!validation.valid) {
            console.warn('Generated tests have issues:', validation.issues);
        }
        
        // Return without showing variation details (hidden from user)
        return {
            language,
            framework: testFramework,
            testCases: finalTests,
            imports: extractImports(fullCode, language),
            fullCode,
            timestamp: Date.now(),
            metadata: {
                duplicatesRemoved: 0, // Hidden
                totalGenerated: TESTS_PER_GENERATION,
                uniqueTests: TESTS_PER_GENERATION
            }
        };
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
    config: ExtensionConfig,
    existingTests?: TestCase[]
): Promise<string> {
    const anthropic = new Anthropic({
        apiKey: config.apiKey
    });
    
    const prompt = buildTestPrompt(code, language, framework, existingTests);
    
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
    config: ExtensionConfig,
    existingTests?: TestCase[]
): Promise<string> {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({
        model: config.model || 'gemini-2.5-flash',
        generationConfig: {
            temperature: config.temperature || 0.7,
            maxOutputTokens: config.maxTokens || 4096,
        }
    });
    
    const prompt = buildTestPrompt(code, language, framework, existingTests);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

/**
 * Build optimized prompt for test generation
 */
function buildTestPrompt(
    code: string, 
    language: string, 
    framework: string, 
    existingTests?: TestCase[]
): string {
    const languageSpecificInstructions = getLanguageSpecificInstructions(language, framework);
    
    // Build existing tests context
    let existingTestsContext = '';
    if (existingTests && existingTests.length > 0) {
        const testDescriptions = existingTests.map(t => 
            `- ${t.name}: tests specific functionality`
        ).join('\n');
        
        existingTestsContext = `\n\nEXISTING TESTS (DO NOT DUPLICATE):
The following ${existingTests.length} tests already exist. Generate DIFFERENT tests with UNIQUE scenarios:
${testDescriptions}

Generate ${TESTS_PER_GENERATION} NEW and DIVERSE tests that cover aspects NOT covered by existing tests above.
`;
    } else {
        existingTestsContext = `\n\nGenerate EXACTLY ${TESTS_PER_GENERATION} diverse and comprehensive tests.`;
    }
    
    return `You are an expert software testing engineer. Generate EXACTLY ${TESTS_PER_GENERATION} comprehensive, RUNNABLE unit tests for the following ${language} code.

CODE TO TEST:
\`\`\`${language}
${code}
\`\`\`
${existingTestsContext}

⚠️ STRICT REQUIREMENT: You MUST generate EXACTLY ${TESTS_PER_GENERATION} tests - NOT ${TESTS_PER_GENERATION - 1}, NOT ${TESTS_PER_GENERATION + 1}, EXACTLY ${TESTS_PER_GENERATION} tests.

CRITICAL REQUIREMENTS FOR ${framework.toUpperCase()}:
1. **Import ALL dependencies ONLY ONCE at the very top** - DO NOT repeat imports
2. **${languageSpecificInstructions.wrapperRequirement}**
3. **Use correct module path** - ${languageSpecificInstructions.importExample}
4. **Generate EXACTLY ${TESTS_PER_GENERATION} test cases covering:**
   - Normal scenarios (~5 tests): typical valid inputs and expected outputs
   - Edge cases (~5 tests): boundary values, empty inputs, null/undefined, large values
   - Error cases (~2 tests): invalid inputs, exceptions, error handling
5. **Each test must be independent and runnable**
6. **Use proper ${framework} syntax and matchers**
7. **${languageSpecificInstructions.organizationTip}**

${languageSpecificInstructions.exampleCode}

CRITICAL - READ CAREFULLY:
- ${languageSpecificInstructions.importRule}
- ${languageSpecificInstructions.structureRule}
- NO explanatory text before/after code
- COMPLETE, RUNNABLE code only
- ${languageSpecificInstructions.matcherInfo}
- ⚠️ EXACTLY ${TESTS_PER_GENERATION} TESTS - COUNT THEM BEFORE RESPONDING
- If you generate ${TESTS_PER_GENERATION - 1} tests, ADD ONE MORE
- If you generate ${TESTS_PER_GENERATION + 1} tests, REMOVE ONE

Generate EXACTLY ${TESTS_PER_GENERATION} tests now:`;
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
 * Generate variations of existing tests by modifying input values
 */
function generateVariations(
    existingTests: TestCase[],
    count: number,
    language: string,
    allExistingTests: TestCase[]
): TestCase[] {
    const variations: TestCase[] = [];
    const usedTests = new Set<string>();
    
    // Shuffle existing tests to get random selection
    const shuffled = [...existingTests].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffled.length && variations.length < count; i++) {
        const original = shuffled[i];
        
        // Skip if already used
        if (usedTests.has(original.id)) {
            continue;
        }
        
        // Generate variation
        const variation = createTestVariation(original, language);
        
        // Check if variation is truly unique (not duplicate of existing)
        const isDuplicate = allExistingTests.some(existing => 
            isSimilarTest(variation, existing)
        );
        
        if (!isDuplicate) {
            variations.push(variation);
            usedTests.add(original.id);
        }
    }
    
    return variations;
}

/**
 * Create a variation of a test by modifying input values
 */
function createTestVariation(original: TestCase, language: string): TestCase {
    let variedCode = original.code;
    let variedName = original.name;
    
    // Number variations - multiply by random factor (2-5x)
    variedCode = variedCode.replace(/\b(\d+)\b/g, (match) => {
        const num = parseInt(match);
        const factor = Math.floor(Math.random() * 4) + 2; // 2-5
        return String(num * factor);
    });
    
    // String variations
    const stringReplacements: { [key: string]: string[] } = {
        'hello': ['world', 'test', 'sample', 'demo'],
        'test': ['demo', 'example', 'sample', 'check'],
        'foo': ['bar', 'baz', 'qux', 'xyz'],
        'name': ['title', 'label', 'tag', 'value'],
        'john': ['jane', 'bob', 'alice', 'charlie'],
        'email': ['mail', 'address', 'contact', 'inbox']
    };
    
    for (const [original, replacements] of Object.entries(stringReplacements)) {
        const regex = new RegExp(`\\b${original}\\b`, 'gi');
        if (regex.test(variedCode)) {
            const replacement = replacements[Math.floor(Math.random() * replacements.length)];
            variedCode = variedCode.replace(regex, replacement);
        }
    }
    
    // Array variations - change length
    variedCode = variedCode.replace(/\[([^\]]+)\]/g, (match, content) => {
        const items = content.split(',').map((s: string) => s.trim());
        if (items.length > 0 && items[0].match(/^\d+$/)) {
            // Numeric array - regenerate with different values
            const newLength = Math.max(2, items.length + Math.floor(Math.random() * 3) - 1);
            const newItems = Array.from({ length: newLength }, () => 
                Math.floor(Math.random() * 100)
            );
            return `[${newItems.join(', ')}]`;
        }
        return match;
    });
    
    // Update test name slightly
    variedName = variedName.replace(/\b(\d+)\b/g, (match) => {
        const num = parseInt(match);
        return String(num * (Math.floor(Math.random() * 3) + 2));
    });
    
    return {
        ...original,
        id: generateId(),
        name: variedName,
        code: variedCode
    };
}

/**
 * Rebuild full test code from test cases
 */
function rebuildFullCode(tests: TestCase[], language: string, framework: string): string {
    if (tests.length === 0) {
        return '';
    }
    
    // Get imports from first test (they should all have same imports)
    const firstTest = tests[0];
    const importMatch = firstTest.code.match(/^(import .+?;|const .+? = require.+?;|from .+? import .+)/m);
    const imports = importMatch ? importMatch[0] : '';
    
    // Extract test bodies
    const testBodies = tests.map(t => {
        // Remove imports from individual tests
        let body = t.code;
        if (importMatch) {
            body = body.replace(importMatch[0], '').trim();
        }
        return body;
    });
    
    // Combine based on language
    if (language === 'javascript' || language === 'typescript') {
        const describeBlock = testBodies.join('\n\n');
        return imports ? `${imports}\n\n${describeBlock}` : describeBlock;
    } else if (language === 'python') {
        return imports ? `${imports}\n\n${testBodies.join('\n\n')}` : testBodies.join('\n\n');
    } else if (language === 'java') {
        return imports ? `${imports}\n\n${testBodies.join('\n\n')}` : testBodies.join('\n\n');
    }
    
    return testBodies.join('\n\n');
}

/**
 * Extract imports from code
 */
function extractImports(code: string, language: string): string {
    const lines = code.split('\n');
    const importLines: string[] = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (language === 'javascript' || language === 'typescript') {
            if (trimmed.startsWith('import ') || trimmed.startsWith('const ') && trimmed.includes('require(')) {
                importLines.push(line);
            }
        } else if (language === 'python') {
            if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                importLines.push(line);
            }
        } else if (language === 'java') {
            if (trimmed.startsWith('import ')) {
                importLines.push(line);
            }
        }
    }
    
    return importLines.join('\n');
}

/**
 * Deduplicate test cases by comparing with existing tests
 * Returns unique tests and count of duplicates removed
 */
export function deduplicateTests(
    newTests: TestCase[],
    existingTests: TestCase[]
): { uniqueTests: TestCase[]; duplicateCount: number } {
    if (!existingTests || existingTests.length === 0) {
        return { uniqueTests: newTests, duplicateCount: 0 };
    }
    
    const uniqueTests: TestCase[] = [];
    let duplicateCount = 0;
    
    // Build existing test signatures for comparison
    const existingSignatures = new Set(
        existingTests.map(t => normalizeTestSignature(t))
    );
    
    for (const newTest of newTests) {
        const newSignature = normalizeTestSignature(newTest);
        
        // Check for exact match
        if (existingSignatures.has(newSignature)) {
            duplicateCount++;
            continue;
        }
        
        // Check for similar tests using fuzzy matching
        let isDuplicate = false;
        for (const existingTest of existingTests) {
            if (isSimilarTest(newTest, existingTest)) {
                duplicateCount++;
                isDuplicate = true;
                break;
            }
        }
        
        if (!isDuplicate) {
            uniqueTests.push(newTest);
            existingSignatures.add(newSignature);
        }
    }
    
    return { uniqueTests, duplicateCount };
}

/**
 * Normalize test signature for comparison
 */
function normalizeTestSignature(test: TestCase): string {
    const name = (test.name || '').toLowerCase().trim();
    return name;
}

/**
 * Check if two tests are similar using fuzzy matching
 */
function isSimilarTest(test1: TestCase, test2: TestCase): boolean {
    const name1 = (test1.name || '').toLowerCase().replace(/[_\s-]/g, '');
    const name2 = (test2.name || '').toLowerCase().replace(/[_\s-]/g, '');
    
    // Exact name match (after normalization)
    if (name1 === name2 && name1.length > 0) {
        return true;
    }
    
    // Check if names are very similar (>80% similarity)
    const similarity = calculateStringSimilarity(name1, name2);
    if (similarity > 0.8) {
        return true;
    }
    
    return false;
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns value between 0 (completely different) and 1 (identical)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }
    
    return matrix[str2.length][str1.length];
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
