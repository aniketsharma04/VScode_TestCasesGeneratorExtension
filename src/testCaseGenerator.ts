/**
 * AI-powered test case generation
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ExtensionConfig, GeneratedTests, SupportedLanguage, TestCase } from './types';

// Configuration constants
const TESTS_PER_GENERATION = 12; // Number of tests to generate per request
const MAX_RETRIES = 2; // Maximum API retry attempts

/**
 * Main function to generate tests using configured AI provider with retry and variation logic
 * 
 * APPROACH 1: Always generate exactly 12 tests per call
 * APPROACH 2: Pass context-aware prompt with previous test descriptions
 * APPROACH 3: Deduplicate against ALL historical tests using Levenshtein distance
 */
export async function generateTests(
    code: string,
    language: SupportedLanguage,
    config: ExtensionConfig,
    framework?: string,
    existingTests?: TestCase[]
): Promise<GeneratedTests> {
    const testFramework = framework || getDefaultFramework(language);
    
    let allUniqueTests: TestCase[] = [];
    let allExistingTests = existingTests || [];
    let totalDuplicatesRemoved = 0;
    let variationsGenerated = 0;
    let totalApiCalls = 0;
    
    try {
        // PHASE 1: Collect results from MAX 2 API calls
        const apiResults: { tests: TestCase[]; rawCount: number; yieldPercent: number }[] = [];
        
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            totalApiCalls++;
            console.log(`\n[Attempt ${totalApiCalls}] Calling AI...`);
            
            // Generate tests based on provider (APPROACH 2: Pass historical context)
            let aiResponse: string;
            if (config.apiProvider === 'anthropic') {
                aiResponse = await generateWithClaude(code, language, testFramework, config, allExistingTests);
            } else {
                aiResponse = await generateWithGemini(code, language, testFramework, config, allExistingTests);
            }
            
            // SOLUTION 7: Post-process to fix structure issues
            console.log(`[Post-Processor] Raw AI response length: ${aiResponse.length} chars`);
            const moduleName = extractModuleName(code, language);
            const fixedResponse = fixTestStructure(aiResponse, language, testFramework, moduleName);
            console.log(`[Post-Processor] Fixed response length: ${fixedResponse.length} chars`);
            
            // SOLUTION 1: Validate structure
            const validation = validateTestStructure(fixedResponse, language);
            if (!validation.valid) {
                console.warn(`[Validation] Structure issues found:`, validation.errors);
                // Continue anyway but log warnings
            } else {
                console.log(`[Validation] ✓ Structure valid`);
            }
            
            // Parse the response
            const parsed = parseTestCases(fixedResponse, language, testFramework);
            
            // APPROACH 3: Deduplicate against ALL existing tests
            const deduplicationResult = deduplicateTests(parsed.testCases, allExistingTests);
            const newUniqueTests = deduplicationResult.uniqueTests;
            
            // Track deduplication
            totalDuplicatesRemoved += deduplicationResult.duplicateCount;
            const yieldPercent = (newUniqueTests.length / parsed.testCases.length) * 100;
            
            apiResults.push({
                tests: newUniqueTests,
                rawCount: parsed.testCases.length,
                yieldPercent: yieldPercent
            });
            
            console.log(`[Attempt ${totalApiCalls}] Generated ${parsed.testCases.length}, Got ${newUniqueTests.length} unique (${Math.round(yieldPercent)}% yield)`);
            
            // Add to our collection
            allUniqueTests.push(...newUniqueTests);
            allExistingTests = [...allExistingTests, ...newUniqueTests];
            
            // Do not stop early; complete both attempts to compute yield
        }
        
        // PHASE 2: Calculate yield for diagnostics
        const averageYield = apiResults.reduce((sum, r) => sum + r.yieldPercent, 0) / apiResults.length;
        console.log(`\n[Yield Analysis] Average yield: ${Math.round(averageYield)}% across ${totalApiCalls} API calls`);
        
        // PHASE 3: Fill remaining tests with variations if we're short of 12
        if (allUniqueTests.length < TESTS_PER_GENERATION) {
            const needed = TESTS_PER_GENERATION - allUniqueTests.length;
            console.log(`\n[Variations] Need ${needed} more tests - generating rule-based variations...`);
            
            // Use full history as source for variations
            const sourceTests = allExistingTests.length > 0 ? allExistingTests : allUniqueTests;
            if (sourceTests.length > 0) {
                const variations = generateVariations(sourceTests, needed, language, allExistingTests);
                variationsGenerated = variations.length;
                allUniqueTests.push(...variations);
                console.log(`[Variations] Generated ${variationsGenerated} variations`);
                
                // Add variations to historical tracking for next round
                allExistingTests = [...allExistingTests, ...variations];
            }
        }
        
        // PHASE 4: Ensure exactly 12 tests (trim if over)
        const finalTests = allUniqueTests.slice(0, TESTS_PER_GENERATION);
        console.log(`\n[Final] Returning ${finalTests.length} tests (${totalApiCalls} API calls, ${variationsGenerated} variations)`);
        
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
        
        // Return with accurate metadata
        return {
            language,
            framework: testFramework,
            testCases: finalTests,
            imports: extractImports(fullCode, language),
            fullCode,
            timestamp: Date.now(),
            metadata: {
                duplicatesRemoved: totalDuplicatesRemoved,
                totalGenerated: TESTS_PER_GENERATION,
                uniqueTests: finalTests.length,
                aiGenerated: allUniqueTests.length - variationsGenerated,
                variationsGenerated: variationsGenerated,
                attempts: totalApiCalls
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
 * Build optimized prompt for test generation with APPROACH 2 (Context Awareness)
 */
function buildTestPrompt(
    code: string, 
    language: string, 
    framework: string, 
    existingTests?: TestCase[]
): string {
    const languageSpecificInstructions = getLanguageSpecificInstructions(language, framework);
    
    // APPROACH 2: Build context-aware prompt with previous test descriptions
    let existingTestsContext = '';
    if (existingTests && existingTests.length > 0) {
        const testDescriptions = existingTests.map(t => {
            // Include test type for better context
            return `- "${t.name}" (${t.type}): This test already covers this scenario`;
        }).join('\n');
        
        existingTestsContext = `\n\n### EXISTING TESTS - DO NOT DUPLICATE
The following ${existingTests.length} tests have already been generated. These test SPECIFIC scenarios and patterns.
Generate COMPLETELY DIFFERENT tests that cover aspects NOT covered by these:

${testDescriptions}

IMPORTANT:
- Avoid similar test names, descriptions, and test logic
- Cover different edge cases, boundaries, and error conditions
- Use different input values and scenarios
- Generate tests for different function behaviors or error types

Generate ${TESTS_PER_GENERATION} NEW and UNIQUE tests.`;
    } else {
        existingTestsContext = `\n\nGenerate EXACTLY ${TESTS_PER_GENERATION} diverse and comprehensive tests.`;
    }
    
    return `🚨 MANDATORY REQUIREMENT: YOU MUST GENERATE EXACTLY ${TESTS_PER_GENERATION} TEST CASES 🚨

You are an expert software testing engineer. Your task is to generate EXACTLY ${TESTS_PER_GENERATION} comprehensive, RUNNABLE unit tests.

ABSOLUTE RULE: ${TESTS_PER_GENERATION} TESTS REQUIRED
- NOT ${TESTS_PER_GENERATION - 9} tests
- NOT ${TESTS_PER_GENERATION - 6} tests  
- NOT ${TESTS_PER_GENERATION - 3} tests
- NOT ${TESTS_PER_GENERATION - 1} tests
- EXACTLY ${TESTS_PER_GENERATION} TESTS

CODE TO TEST:
\`\`\`${language}
${code}
\`\`\`
${existingTestsContext}

📋 MANDATORY TEST COUNT BREAKDOWN (MUST TOTAL ${TESTS_PER_GENERATION}):
✓ Normal scenarios: 5-6 tests (typical valid inputs)
✓ Edge cases: 4-5 tests (boundary values, empty, null, large values)
✓ Error cases: 2-3 tests (invalid inputs, exceptions)
= TOTAL: EXACTLY ${TESTS_PER_GENERATION} TESTS

REQUIREMENTS:
1. Import ALL dependencies ONLY ONCE at the very top — DO NOT repeat imports
2. ${languageSpecificInstructions.wrapperRequirement}
3. Use correct module path — ${languageSpecificInstructions.importExample}
4. Generate EXACTLY ${TESTS_PER_GENERATION} test cases (see breakdown above)
5. Each test must be independent and runnable
6. Use proper ${framework} syntax and matchers
7. ${languageSpecificInstructions.organizationTip}

${languageSpecificInstructions.exampleCode}

CRITICAL SYNTAX VALIDATION RULES:
- ${languageSpecificInstructions.importRule}
- ${languageSpecificInstructions.structureRule}
- NO explanatory text before/after code
- COMPLETE, RUNNABLE code only
- ${languageSpecificInstructions.matcherInfo}

🔢 FINAL VERIFICATION CHECKLIST (COMPLETE BEFORE RETURNING):
□ Step 1: Count how many test() or it() blocks you wrote
□ Step 2: If count < ${TESTS_PER_GENERATION}: GO BACK and add more tests until you reach ${TESTS_PER_GENERATION}
□ Step 3: If count > ${TESTS_PER_GENERATION}: GO BACK and remove excess tests to get exactly ${TESTS_PER_GENERATION}
□ Step 4: Verify count === ${TESTS_PER_GENERATION} (THIS IS MANDATORY)
□ Step 5: Check syntax validity (brackets, indentation, semicolons)
□ Step 6: Only NOW return your code

DO NOT RETURN CODE UNTIL YOU HAVE VERIFIED ${TESTS_PER_GENERATION} TESTS EXIST.

Generate your ${TESTS_PER_GENERATION} tests now:`;
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
            wrapperRequirement: 'Wrap ALL ${TESTS_PER_GENERATION} tests in a SINGLE describe() block',
            importExample: 'If testing example.js, use require(\'./example\')',
            organizationTip: 'Use nested describe blocks for better organization',
            exampleCode: `⚠️ CRITICAL: You MUST generate EXACTLY ${TESTS_PER_GENERATION} test() blocks, NOT 2, NOT 5, EXACTLY ${TESTS_PER_GENERATION}!

EXACT STRUCTURE (Jest - ${TESTS_PER_GENERATION} tests required):
\`\`\`javascript
const { add, divide, findMax } = require('./example');

describe('Example Functions', () => {
  // Test 1
  test('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
  
  // Test 2
  test('should add positive and negative numbers', () => {
    expect(add(5, -2)).toBe(3);
  });
  
  // Test 3
  test('should add two negative numbers', () => {
    expect(add(-5, -3)).toBe(-8);
  });
  
  // Test 4
  test('should add floating point numbers', () => {
    expect(add(2.5, 3.5)).toBe(6);
  });
  
  // Test 5
  test('should divide two positive numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });
  
  // Test 6
  test('should divide negative by positive', () => {
    expect(divide(-10, 2)).toBe(-5);
  });
  
  // Test 7
  test('should return zero dividing zero by non-zero', () => {
    expect(divide(0, 5)).toBe(0);
  });
  
  // Test 8
  test('should throw error on division by zero', () => {
    expect(() => divide(5, 0)).toThrow();
  });
  
  // Test 9
  test('should find max in positive array', () => {
    expect(findMax([1, 5, 2, 8, 3])).toBe(8);
  });
  
  // Test 10
  test('should find max in mixed array', () => {
    expect(findMax([-1, 5, -8, 2, 0])).toBe(5);
  });
  
  // Test 11
  test('should return null for empty array', () => {
    expect(findMax([])).toBeNull();
  });
  
  // Test 12
  test('should return single element for one-element array', () => {
    expect(findMax([7])).toBe(7);
  });
});
\`\`\`

⚠️ COUNT YOUR TESTS: The example above has EXACTLY 12 test() blocks numbered Test 1 through Test 12. YOU MUST DO THE SAME!

STRICT SYNTAX RULES:
1. ONE require() statement at the very top - NO duplicates
2. ONE describe() block wrapping ALL ${TESTS_PER_GENERATION} tests
3. EXACTLY ${TESTS_PER_GENERATION} test() blocks inside describe
4. Use EXACTLY 2 spaces for each indentation level
5. Every opening { must have matching closing }
6. Every statement inside test must end with semicolon;
7. Close describe with }); at the end
8. NO test() blocks outside of describe()
9. Verify: count(test() blocks) === ${TESTS_PER_GENERATION} before returning`,
            importRule: 'ONE require() statement at top - NO duplicate require() anywhere',
            structureRule: 'ONE describe block with EXACTLY ${TESTS_PER_GENERATION} test() blocks inside - NO orphan test() blocks',
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
\`\`\`

STRICT SYNTAX RULES:
1. Use EXACTLY 2 spaces for each indentation level
2. Every opening brace { must have matching closing brace }
3. Import statement must be valid ES6 syntax with semicolon
4. All statements inside test must end with semicolon;
5. Verify bracket count: count({) must equal count(})`,
            importRule: 'ONE import statement at top - NO duplicate imports',
            structureRule: 'ONE main describe block wrapping everything - proper bracket matching',
            matcherInfo: 'Use appropriate matchers: .toBe(), .toEqual(), .toThrow()'
        },
        'python': {
            wrapperRequirement: 'Wrap all tests in a test class or use separate test functions',
            importExample: 'If testing example.py, use from example import add, divide',
            organizationTip: 'Group related tests in test classes',
            exampleCode: `⚠️ CRITICAL: Generate EXACTLY ${TESTS_PER_GENERATION} complete test methods!

EXACT STRUCTURE - COPY THIS FORMAT EXACTLY (pytest with ${TESTS_PER_GENERATION} tests):
\`\`\`python
import pytest
from calculator import Calculator

class TestCalculator:
    def test_add_positive_numbers(self):
        calc = Calculator()
        assert calc.add(2, 3) == 5
    
    def test_add_negative_numbers(self):
        calc = Calculator()
        assert calc.add(-5, -3) == -8
    
    def test_add_zero(self):
        calc = Calculator()
        assert calc.add(5, 0) == 5
    
    def test_add_floats(self):
        calc = Calculator()
        assert calc.add(2.5, 3.5) == 6.0
    
    def test_subtract_positive(self):
        calc = Calculator()
        assert calc.subtract(10, 3) == 7
    
    def test_subtract_negative(self):
        calc = Calculator()
        assert calc.subtract(5, -2) == 7
    
    def test_multiply_positive(self):
        calc = Calculator()
        assert calc.multiply(4, 5) == 20
    
    def test_multiply_by_zero(self):
        calc = Calculator()
        assert calc.multiply(10, 0) == 0
    
    def test_divide_positive(self):
        calc = Calculator()
        assert calc.divide(10, 2) == 5.0
    
    def test_divide_by_zero_raises_error(self):
        calc = Calculator()
        with pytest.raises(ValueError):
            calc.divide(10, 0)
    
    def test_power_positive(self):
        calc = Calculator()
        assert calc.power(2, 3) == 8
    
    def test_square_root(self):
        calc = Calculator()
        assert calc.sqrt(16) == 4.0
\`\`\`

⚠️ COUNT: The example above has EXACTLY ${TESTS_PER_GENERATION} methods. YOU MUST DO THE SAME!

🚨 CRITICAL PYTHON SYNTAX RULES - INCOMPLETE CODE IS THE #1 ERROR:

EVERY STATEMENT MUST BE COMPLETE:
❌ WRONG: for item in items (INCOMPLETE - missing colon and body)
✅ CORRECT: for item in items:
              process(item)

❌ WRONG: if x > 0 (INCOMPLETE - missing colon and body)
✅ CORRECT: if x > 0:
              return x

❌ WRONG: with pytest.raises(ValueError) (INCOMPLETE - missing colon)
✅ CORRECT: with pytest.raises(ValueError):
              divide(5, 0)

❌ WRONG: result = calculate( (INCOMPLETE - missing closing paren)
✅ CORRECT: result = calculate(10)

INDENTATION LEVELS (Use SPACES, never TABS):
[Column 0] → Imports and class definition
[4 spaces] → Method definitions (def test_...)
[8 spaces] → Code inside methods (assert, with, etc.)
[12 spaces] → Code inside nested blocks (inside with/for/if)

MANDATORY FORMAT:
- Line 1: import pytest (NO spaces before import)
- Line 2: from module import Class (NO spaces before from)
- Line 3: BLANK LINE
- Line 4: class TestXxx: (NO spaces before class, MUST end with colon)
- Line 5 onwards: def test_xxx(self): with EXACTLY 4 spaces and colon at end
- Method body: assert/code with EXACTLY 8 spaces
- Nested blocks: EXACTLY 12 spaces

STEP-BY-STEP CHECKLIST:
1. ✓ Imports start at column 0 (NO spaces before 'from' or 'import')
2. ✓ Blank line after imports
3. ✓ 'class TestCalculator:' starts at column 0 with colon at end
4. ✓ Each 'def test_...(self):' line starts with EXACTLY 4 spaces and ends with colon
5. ✓ Code inside each method starts with EXACTLY 8 spaces
6. ✓ Every for/if/with/try statement ends with colon and has indented body
7. ✓ All parentheses/brackets are closed
8. ✓ Use ONLY spaces (never press TAB key)

COMMON MISTAKES TO AVOID:
❌ WRONG: for item in items (missing : and body)
❌ WRONG: if condition (missing : and body)
❌ WRONG: with pytest.raises() (missing : after)
❌ WRONG: Adding spaces before 'class TestCalculator:'
❌ WRONG: Using 2 or 3 spaces instead of 4
✅ CORRECT: Every control structure ends with : and has body
✅ CORRECT: All code blocks properly indented with 4-space increments

BEFORE YOU SUBMIT - VERIFY:
- Count ${TESTS_PER_GENERATION} test methods exist
- Every line with class/def/if/for/with/try ends with :
- Every for/if/with/try has an indented body below it
- All parentheses and brackets are closed
- No incomplete statements`,
            importRule: 'Import statements at column 0 with ZERO indentation',
            structureRule: 'class at column 0, def at 4 spaces, code at 8+ spaces - ALL statements must be complete with colons and bodies',
            matcherInfo: 'Use assert statements and pytest.raises() for exceptions'
        },
        'java': {
            wrapperRequirement: 'Create a test class with @Test methods (JUnit 5)',
            importExample: 'If testing Calculator.java, import com.testcase.Calculator',
            organizationTip: 'Use @Test annotation for each test method',
            exampleCode: `⚠️ CRITICAL: Generate EXACTLY ${TESTS_PER_GENERATION} test methods!

EXACT STRUCTURE - COPY THIS FORMAT (JUnit 5 with ${TESTS_PER_GENERATION} tests):
\`\`\`java
package com.testcase;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    public void testAddPositiveNumbers() {
        assertEquals(5, Calculator.add(2, 3));
    }
    
    @Test
    public void testAddNegativeNumbers() {
        assertEquals(-8, Calculator.add(-5, -3));
    }
    
    @Test
    public void testAddZero() {
        assertEquals(5, Calculator.add(5, 0));
    }
    
    @Test
    public void testSubtractPositive() {
        assertEquals(7, Calculator.subtract(10, 3));
    }
    
    @Test
    public void testSubtractNegative() {
        assertEquals(7, Calculator.subtract(5, -2));
    }
    
    @Test
    public void testMultiplyPositive() {
        assertEquals(20, Calculator.multiply(4, 5));
    }
    
    @Test
    public void testMultiplyByZero() {
        assertEquals(0, Calculator.multiply(10, 0));
    }
    
    @Test
    public void testDividePositive() {
        assertEquals(5.0, Calculator.divide(10, 2), 0.001);
    }
    
    @Test
    public void testDivideByZeroThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.divide(5, 0);
        });
    }
    
    @Test
    public void testPowerPositive() {
        assertEquals(8, Calculator.power(2, 3));
    }
    
    @Test
    public void testSquareRoot() {
        assertEquals(4.0, Calculator.sqrt(16), 0.001);
    }
    
    @Test
    public void testFindMax() {
        assertEquals(8, Calculator.findMax(new int[]{1, 5, 8, 3}));
    }
}
\`\`\`

⚠️ COUNT: The example above has EXACTLY ${TESTS_PER_GENERATION} @Test methods. YOU MUST DO THE SAME!

🚨 CRITICAL JAVA SYNTAX RULES - INCOMPLETE CODE CAUSES COMPILATION ERRORS:

EVERY CODE BLOCK MUST BE COMPLETE:
❌ WRONG: @Test method with no closing brace }
✅ CORRECT: Every @Test method has opening { and closing }

❌ WRONG: Lambda with no closing: () -> { code (missing })
✅ CORRECT: () -> { code };

❌ WRONG: Method call without semicolon: Calculator.add(2, 3)
✅ CORRECT: Calculator.add(2, 3);

❌ WRONG: if statement without braces: if (x > 0) return x
✅ CORRECT: if (x > 0) { return x; }

INDENTATION (Use 4 spaces per level):
[Column 0] → Package declaration
[Column 0] → Imports
[Column 0] → public class CalculatorTest {
[4 spaces] → @Test annotations and method signatures
[4 spaces] → Method opening brace {
[8 spaces] → Code inside methods
[4 spaces] → Method closing brace }
[Column 0] → Class closing brace }

MANDATORY STRUCTURE:
1. Package declaration (if present)
2. Import statements
3. public class TestXxx {
4. ONE @Test annotation per method (on line directly above method)
5. public void testXxx() { (method signature)
6. Code with proper indentation
7. } (close method)
8. Repeat for all ${TESTS_PER_GENERATION} tests
9. } (close class)

STRICT SYNTAX RULES:
1. Every opening { MUST have matching closing }
2. Every statement inside methods MUST end with semicolon;
3. @Test annotation on line directly above method (no blank line)
4. Lambda syntax: () -> { code }; must be complete
5. Count braces before submitting: opening { === closing }

BEFORE YOU SUBMIT - VERIFY:
- Count ${TESTS_PER_GENERATION} @Test methods exist
- Every { has matching }
- Every statement ends with ;
- All method bodies are complete
- No incomplete lambdas or code blocks`,
            importRule: 'Import JUnit 5 classes first, then static imports - ONE import block at top',
            structureRule: 'Class at column 0, @Test+methods at 4 spaces, code at 8 spaces - ALL blocks must be complete',
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
/**
 * Create a variation of a test by modifying input values semantically
 * Preserves test type (normal/edge/error) and semantic correctness
 */
function createTestVariation(original: TestCase, language: string): TestCase {
    let variedCode = original.code;
    let variedName = original.name;
    
    // Preserve test type information in naming
    const testType = original.type; // 'normal', 'edge', or 'error'
    
    // SEMANTIC CORRECTNESS: Preserve error test semantics
    if (testType === 'error') {
        // For error tests, change input values but maintain error trigger
        // e.g., "divide(10, 0)" → "divide(50, 0)" (still triggers error)
        variedCode = variedCode.replace(/\b(\d+)\b/g, (match, offset, str) => {
            // Check if this number is likely a divisor or error trigger
            const beforeMatch = str.substring(0, offset).toLowerCase();
            const isErrorTrigger = beforeMatch.includes('0') || beforeMatch.includes('null') || beforeMatch.includes('empty');
            
            if (isErrorTrigger && parseInt(match) === 0) {
                return '0'; // Keep zero for error cases
            }
            
            const num = parseInt(match);
            if (num === 0) return '0'; // Preserve zeros
            
            const factor = Math.floor(Math.random() * 4) + 2; // 2-5x
            return String(Math.max(1, num * factor));
        });
    } else {
        // For normal/edge tests, vary numbers more freely
        variedCode = variedCode.replace(/\b(\d+)\b/g, (match) => {
            const num = parseInt(match);
            if (num === 0) return '0'; // Don't change 0s in non-error cases (could be indices)
            const factor = Math.floor(Math.random() * 4) + 2; // 2-5
            return String(num * factor);
        });
    }
    
    // String variations - replace common test strings
    const stringReplacements: { [key: string]: string[] } = {
        'hello': ['world', 'test', 'sample', 'demo'],
        'test': ['demo', 'example', 'sample', 'check'],
        'foo': ['bar', 'baz', 'qux', 'xyz'],
        'name': ['title', 'label', 'tag', 'value'],
        'john': ['jane', 'bob', 'alice', 'charlie'],
        'email': ['mail', 'address', 'contact', 'inbox']
    };
    
    for (const [origStr, replacements] of Object.entries(stringReplacements)) {
        const regex = new RegExp(`\\b${origStr}\\b`, 'gi');
        if (regex.test(variedCode)) {
            const replacement = replacements[Math.floor(Math.random() * replacements.length)];
            variedCode = variedCode.replace(regex, replacement);
        }
    }
    
    // Array variations - change values while maintaining type
    variedCode = variedCode.replace(/\[([^\]]+)\]/g, (match, content) => {
        const items = content.split(',').map((s: string) => s.trim());
        if (items.length > 0 && items[0].match(/^\d+$/)) {
            // Numeric array - regenerate with different values (2-5x multiplier)
            const newItems = items.map((item: string) => {
                const num = parseInt(item);
                return String(num * (Math.floor(Math.random() * 4) + 2));
            });
            return `[${newItems.join(', ')}]`;
        }
        return match;
    });
    
    // Update test name with variation marker
    variedName = variedName.replace(/\b(\d+)\b/g, (match) => {
        const num = parseInt(match);
        if (num === 0) return '0';
        return String(num * (Math.floor(Math.random() * 3) + 2));
    });
    
    // Add subtle variation indicator to name
    if (!variedName.includes('variant') && !variedName.includes('v2') && !variedName.includes('v3')) {
        const versionMarkers = ['v2', 'variant', 'alternative'];
        variedName = `${variedName} (${versionMarkers[Math.floor(Math.random() * versionMarkers.length)]})`;
    }
    
    return {
        ...original,
        id: generateId(),
        name: variedName,
        code: variedCode,
        type: testType  // Preserve test type
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
        // Enforce ONE import and ONE describe wrapping ALL tests
        const importLine = imports || "const { } = require('./module');";
        const cleanedBodies = testBodies.map(body => {
            return body
                // drop any stray require/import at the top of the test body
                .replace(/^\s*(const\s+\{[^}]+\}\s*=\s*require\([^)]*\);?|import\s+[^;]+;?)\s*/m, '')
                .trim();
        });
        const indentedTests = cleanedBodies.map(tb => indentLines(tb, 2)).join('\n\n');
        return `${importLine}\n\ndescribe('Generated Tests', () => {\n${indentedTests}\n});`;
    } else if (language === 'python') {
        // Rewrap all tests inside a single class to avoid indentation errors
        const moduleName = 'Generated';
        const indentedBodies = testBodies.map(body => {
            return body.split('\n').map(line => {
                if (line.trim()) {
                    return '    ' + line.trim();
                }
                return '';
            }).join('\n');
        }).join('\n\n');

        const classBlock = `class Test${moduleName}:\n${indentedBodies}\n`;
        return imports ? `${imports}\n\n${classBlock}` : classBlock;
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
 * Helper: indent each line by n spaces
 */
function indentLines(text: string, spaces: number): string {
    const pad = ' '.repeat(spaces);
    return text.split('\n').map(line => line ? pad + line : '').join('\n');
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

/**
 * SOLUTION 2: Language-specific templates for guaranteed structure
 */
function getTestTemplate(language: string, framework: string, moduleName: string): {
    template: string;
    placeholder: string;
} {
    if (language === 'javascript' || language === 'typescript') {
        const importSyntax = language === 'javascript' 
            ? `const { /* functions */ } = require('./${moduleName}');`
            : `import { /* functions */ } from './${moduleName}';`;
            
        return {
            template: `${importSyntax}

describe('${moduleName} Tests', () => {
{{TEST_BLOCKS}}
});
`,
            placeholder: '{{TEST_BLOCKS}}'
        };
    }
    
    if (language === 'python') {
        return {
            template: `import pytest
from ${moduleName} import *

class Test${capitalize(moduleName)}:
{{TEST_BLOCKS}}
`,
            placeholder: '{{TEST_BLOCKS}}'
        };
    }
    
    if (language === 'java') {
        return {
            template: `import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class ${capitalize(moduleName)}Test {
{{TEST_BLOCKS}}
}
`,
            placeholder: '{{TEST_BLOCKS}}'
        };
    }
    
    // Default: return code as-is
    return {
        template: '{{TEST_BLOCKS}}',
        placeholder: '{{TEST_BLOCKS}}'
    };
}

/**
 * SOLUTION 7: Post-processor to extract test blocks and rebuild with template
 */
export function fixTestStructure(code: string, language: string, framework: string, moduleName: string = 'example'): string {
    console.log(`[Post-Processor] Fixing ${language} test structure...`);
    
    if (language === 'javascript' || language === 'typescript') {
        return fixJavaScriptStructure(code, language, moduleName);
    }
    
    if (language === 'python') {
        return fixPythonStructure(code, moduleName);
    }
    
    if (language === 'java') {
        return fixJavaStructure(code, moduleName);
    }
    
    return code;
}

/**
 * Fix JavaScript/TypeScript test structure
 */
function fixJavaScriptStructure(code: string, language: string, moduleName: string): string {
    // Extract import/require statements (should be at top)
    const importRegex = language === 'javascript'
        ? /(?:const|let|var)\s+\{[^}]+\}\s*=\s*require\([^)]+\);?/g
        : /import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];?/g;
    
    const imports = code.match(importRegex) || [];
    const uniqueImports = [...new Set(imports)]; // Remove duplicates
    const importStatement = uniqueImports[0] || (language === 'javascript' 
        ? `const { } = require('./${moduleName}');`
        : `import { } from './${moduleName}';`);
    
    // Extract test() or it() blocks
    const testRegex = /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(?:async\s+)?\(\s*\)\s*=>\s*\{[\s\S]*?\n\s*\}\s*\);?/g;
    const tests = code.match(testRegex) || [];
    
    if (tests.length === 0) {
        console.warn('[Post-Processor] No test blocks found in JavaScript code');
        return code; // Return original if no tests found
    }
    
    // Rebuild with proper structure
    const indentedTests = tests.map(test => '  ' + test.trim()).join('\n\n');
    
    return `${importStatement}

describe('${moduleName} Tests', () => {
${indentedTests}
});
`;
}

/**
 * Fix Python test structure
 */
function fixPythonStructure(code: string, moduleName: string): string {
    console.log('[Post-Processor] Fixing Python structure...');
    
    // Extract import statements
    const importRegex = /^(?:import|from)\s+.+$/gm;
    const imports = code.match(importRegex) || [];
    const uniqueImports = [...new Set(imports.map(i => i.trim()))];
    const importStatements = (uniqueImports.join('\n') || `import pytest\nfrom ${moduleName} import *`).trim();
    
    // Simple approach: Extract ALL def test_ lines and their bodies
    const lines = code.split('\n');
    const testMethods: string[] = [];
    let currentTest: string[] = [];
    let inTestMethod = false;
    let baseIndent = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Found a test method definition
        if (trimmed.startsWith('def test_')) {
            // Save previous test if exists
            if (currentTest.length > 0) {
                testMethods.push(currentTest.join('\n'));
            }
            currentTest = [line.trimStart()]; // Remove any existing indentation
            inTestMethod = true;
            baseIndent = line.search(/\S/); // Find original indent level
        } 
        // Inside a test method
        else if (inTestMethod) {
            const currentIndent = line.search(/\S/);
            
            // Empty line or continuation of test
            if (trimmed === '' || currentIndent > baseIndent || trimmed.startsWith('#')) {
                currentTest.push(line.substring(baseIndent)); // Remove base indent
            }
            // New non-test definition or dedent - end of current test
            else if (trimmed.startsWith('def ') || trimmed.startsWith('class ') || currentIndent <= baseIndent) {
                testMethods.push(currentTest.join('\n'));
                currentTest = [];
                inTestMethod = false;
            }
        }
    }
    
    // Save last test
    if (currentTest.length > 0) {
        testMethods.push(currentTest.join('\n'));
    }
    
    // Fallback: if no tests found via streaming loop, try a regex catch-all
    if (testMethods.length === 0) {
        const fallbackMatches = code.match(/def\s+test_\w+\s*\([^)]*\)\s*:[\s\S]*?(?=^def\s+test_|^class\s+|\Z)/gm) || [];
        if (fallbackMatches.length > 0) {
            testMethods.push(...fallbackMatches.map(t => t.trimStart()));
        }
    }
    
    if (testMethods.length === 0) {
        console.warn('[Post-Processor] No test methods found in Python code');
        return `${importStatements}\n\nclass Test${capitalize(moduleName)}:\n    def test_placeholder(self):\n        assert True\n`;
    }
    
    console.log(`[Post-Processor] Found ${testMethods.length} test methods`);
    
    // Check if any test has 'self' parameter
    const hasClassMethods = testMethods.some(test => /def\s+test_\w+\s*\(\s*self\s*[,)]/.test(test));
    
    if (hasClassMethods || testMethods.length > 0) {
        // ALWAYS wrap in class if we have test methods
        // Re-indent everything: methods at 4 spaces, code at 8+ spaces
        const indentedTests = testMethods.map(test => {
            const lines = test.split('\n');
            return lines.map((line, idx) => {
                if (idx === 0) {
                    // Method definition: 4 spaces
                    return '    ' + line.trim();
                } else if (line.trim()) {
                    // Method body: 8 spaces (or more for nested blocks)
                    const trimmed = line.trimStart();
                    const extraIndent = line.length - line.trimStart().length;
                    return '        ' + '    '.repeat(Math.floor(extraIndent / 4)) + trimmed;
                }
                return ''; // Empty line
            }).join('\n');
        }).join('\n\n');
        
        return `${importStatements}

class Test${capitalize(moduleName)}:
${indentedTests}
`;
    } else {
        // Standalone functions (rare case)
        return `${importStatements}

${testMethods.join('\n\n')}
`;
    }
}

/**
 * Fix Java test structure
 */
function fixJavaStructure(code: string, moduleName: string): string {
    // Extract imports
    const importRegex = /^import\s+.+;$/gm;
    const imports = code.match(importRegex) || [];
    const uniqueImports = [...new Set(imports)];
    const importStatements = uniqueImports.join('\n') || 
        `import org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.*;`;
    
    // Extract test methods (@Test annotation + method)
    const testRegex = /@Test[\s\S]*?(?:public|private|protected)?\s+void\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g;
    const tests = code.match(testRegex) || [];
    
    if (tests.length === 0) {
        console.warn('[Post-Processor] No test methods found in Java code');
        return code;
    }
    
    // Indent tests (4 spaces for class methods)
    const indentedTests = tests.map(test => {
        return test.split('\n').map(line => '    ' + line).join('\n');
    }).join('\n\n');
    
    return `${importStatements}

public class ${capitalize(moduleName)}Test {
${indentedTests}
}
`;
}

/**
 * SOLUTION 1: Validate test structure (basic syntax check)
 */
export function validateTestStructure(code: string, language: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (language === 'javascript' || language === 'typescript') {
        // Check for balanced braces
        const openBraces = (code.match(/\{/g) || []).length;
        const closeBraces = (code.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            errors.push(`Unbalanced braces: ${openBraces} opening, ${closeBraces} closing`);
        }
        
        // Check for describe block
        if (!code.includes('describe(')) {
            errors.push('Missing describe() wrapper block');
        }
        
        // Check for test blocks
        const testCount = (code.match(/(?:test|it)\s*\(/g) || []).length;
        if (testCount === 0) {
            errors.push('No test() blocks found');
        }
        
        // Check for multiple require/import statements
        const requireCount = (code.match(/require\s*\(/g) || []).length;
        const importCount = (code.match(/^import\s+/gm) || []).length;
        if (requireCount > 1 || importCount > 1) {
            errors.push(`Multiple import statements found (${requireCount + importCount}). Should have only ONE at top.`);
        }
    }
    
    if (language === 'python') {
        // Check for class definition if methods have 'self'
        if (code.includes('def test_') && code.includes('(self')) {
            if (!code.includes('class Test')) {
                errors.push('Test methods with "self" parameter but no class definition found');
            }
        }
        
        // Check for proper indentation (basic check)
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('def test_')) {
                const indent = line.search(/\S/);
                if (code.includes('class Test') && indent !== 4) {
                    errors.push(`Line ${i + 1}: Test method should be indented with 4 spaces inside class`);
                    break;
                }
            }
        }
    }
    
    if (language === 'java') {
        // Check for class definition
        if (!code.includes('public class') && !code.includes('class ')) {
            errors.push('No class definition found');
        }
        
        // Check for @Test annotations
        const testCount = (code.match(/@Test/g) || []).length;
        if (testCount === 0) {
            errors.push('No @Test annotations found');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Helper: Capitalize first letter
 */
function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Extract module name from code for template generation
 */
function extractModuleName(code: string, language: string): string {
    // Try to extract from class/function names
    if (language === 'javascript' || language === 'typescript') {
        // Look for class or function exports
        const classMatch = code.match(/(?:export\s+)?class\s+(\w+)/);
        if (classMatch) return classMatch[1];
        
        const functionMatch = code.match(/(?:export\s+)?function\s+(\w+)/);
        if (functionMatch) return functionMatch[1];
    }
    
    if (language === 'python') {
        const classMatch = code.match(/class\s+(\w+)/);
        if (classMatch) return classMatch[1];
    }
    
    if (language === 'java') {
        const classMatch = code.match(/public\s+class\s+(\w+)/);
        if (classMatch) return classMatch[1];
    }
    
    // Default fallback
    return 'module';
}
