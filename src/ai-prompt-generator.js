/**
 * Enhanced AI Prompt Generator - Prevents Truncation
 */

class AIPromptGenerator {
  /**
   * Generate a comprehensive prompt that prevents AI truncation
   */
  static generatePrompt(sourceCode, fileName, options = {}) {
    const {
      framework = 'jest',
      testCount = 10,
      includeEdgeCases = true,
      includeErrorCases = true
    } = options;

    // Limit source code length to prevent context overflow
    const maxSourceLength = 8000;
    const truncatedSource = sourceCode.length > maxSourceLength 
      ? sourceCode.substring(0, maxSourceLength) + '\n// ... (truncated for brevity)'
      : sourceCode;

    const prompt = `Generate COMPLETE Jest unit tests. DO NOT TRUNCATE.

ABSOLUTE REQUIREMENTS - READ CAREFULLY:
1. Generate COMPLETE tests - every test MUST have:
   - Opening: test('description', () => {
   - Body: actual test code
   - Closing: });
   
2. NEVER stop mid-test. Complete ALL tests you start.

3. If you're running out of space:
   - Generate FEWER but COMPLETE tests
   - Better to have 5 complete tests than 10 incomplete tests

4. EVERY test must be syntactically valid JavaScript
   - Count your braces: { must match }
   - Count your parens: ( must match )
   - Every expect() statement must be complete

5. Use this EXACT structure:

\`\`\`javascript
const ModuleName = require('./filename');

describe('ModuleName Tests', () => {
  let instance;
  
  beforeEach(() => {
    instance = new ModuleName();
  });
  
  test('complete test 1', () => {
    // test code
    expect(value).toBe(expected);
  }); // ← MUST close here
  
  test('complete test 2', () => {
    // test code
    expect(value).toBe(expected);
  }); // ← MUST close here
});
\`\`\`

CRITICAL: If you cannot complete ALL ${testCount} tests, generate FEWER complete tests.
Quality over quantity. 3 complete tests > 10 incomplete tests.

**Source Code to Test:**
\`\`\`javascript
${truncatedSource}
\`\`\`

**File Name:** ${fileName}

Generate ${Math.min(testCount, 8)} COMPLETE tests now. DO NOT TRUNCATE:`;

    return prompt;
  }

  /**
   * Generate prompt with token management
   */
  static generatePromptWithTokenLimit(sourceCode, fileName, maxTokens = 2000) {
    // Estimate: 1 token ≈ 4 characters
    const maxSourceChars = maxTokens * 4 * 0.6; // Use 60% of budget for source
    
    const truncatedSource = sourceCode.length > maxSourceChars
      ? sourceCode.substring(0, maxSourceChars) + '\n// ...'
      : sourceCode;

    return `Generate exactly 5 COMPLETE Jest tests. DO NOT generate incomplete tests.

Source (${fileName}):
\`\`\`javascript
${truncatedSource}
\`\`\`

Requirements:
1. Use: const Module = require('./${fileName}');
2. Wrap in: describe('Tests', () => { ... });
3. Create instance in beforeEach() if it's a class
4. Generate 5 COMPLETE tests
5. NEVER truncate mid-test

Generate now:`;
  }

  /**
   * Generate prompt for specific class
   */
  static generateClassPrompt(sourceCode, fileName, className) {
    const maxLength = 6000;
    const source = sourceCode.length > maxLength 
      ? sourceCode.substring(0, maxLength) + '\n// ...'
      : sourceCode;

    return `Generate 5-8 COMPLETE Jest tests for this class. DO NOT TRUNCATE.

REQUIRED FORMAT (use this EXACTLY):
\`\`\`javascript
const ${className} = require('./${fileName}');

describe('${className} Tests', () => {
  let instance;
  
  beforeEach(() => {
    instance = new ${className}();
  });
  
  test('test 1 description', () => {
    const result = instance.method();
    expect(result).toBeDefined();
  });
  
  // ... more COMPLETE tests
});
\`\`\`

**Source Code:**
\`\`\`javascript
${source}
\`\`\`

CRITICAL RULES:
- Complete EVERY test you start
- If running out of space, generate FEWER tests
- Never stop mid-test
- Every { must have matching }
- Every ( must have matching )

Generate COMPLETE tests now:`;
  }

  /**
   * Generate prompt for functions
   */
  static generateFunctionPrompt(sourceCode, fileName, functions) {
    const source = sourceCode.length > 6000 
      ? sourceCode.substring(0, 6000) + '\n// ...'
      : sourceCode;

    return `Generate COMPLETE Jest tests. DO NOT TRUNCATE.

Module exports: ${functions.join(', ')}

REQUIRED FORMAT:
\`\`\`javascript
const { ${functions.join(', ')} } = require('./${fileName}');

describe('${fileName} Tests', () => {
  test('${functions[0]} works correctly', () => {
    const result = ${functions[0]}(/* args */);
    expect(result).toBeDefined();
  });
  
  // ... more COMPLETE tests
});
\`\`\`

Source Code:
\`\`\`javascript
${source}
\`\`\`

Generate 5-7 COMPLETE tests. NEVER truncate mid-test:`;
  }

  /**
   * Post-process AI response to detect truncation
   */
  static detectTruncation(aiResponse) {
    const issues = [];
    
    // Check for incomplete tests
    const testStarts = (aiResponse.match(/test\s*\(/g) || []).length;
    const testEnds = (aiResponse.match(/\}\s*\)\s*;/g) || []).length;
    
    if (testStarts > testEnds) {
      issues.push({
        type: 'incomplete_tests',
        message: `Found ${testStarts} test starts but only ${testEnds} test ends`,
        severity: 'error'
      });
    }
    
    // Check for truncated in middle of statement
    const lastLine = aiResponse.trim().split('\n').pop();
    if (!lastLine.includes(');') && !lastLine.includes('});')) {
      issues.push({
        type: 'truncated_end',
        message: 'Response appears truncated (no proper closing)',
        severity: 'warning'
      });
    }
    
    // Check brace balance
    const openBraces = (aiResponse.match(/\{/g) || []).length;
    const closeBraces = (aiResponse.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      issues.push({
        type: 'unbalanced_braces',
        message: `${openBraces} open braces, ${closeBraces} close braces`,
        severity: 'error'
      });
    }
    
    return {
      isTruncated: issues.length > 0,
      issues,
      score: issues.length === 0 ? 100 : Math.max(0, 100 - (issues.length * 25))
    };
  }
}

module.exports = AIPromptGenerator;