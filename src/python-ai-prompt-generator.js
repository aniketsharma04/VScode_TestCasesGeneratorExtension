/*
 * Python AI Prompt Generator
 * Creates optimized prompts for pytest test generation
 */

class PythonAIPromptGenerator {
  static generatePrompt(sourceCode, fileName, options = {}) {
    const {
      testCount = 10,
      includeEdgeCases = true,
      includeErrorCases = true
    } = options;
    const maxSourceLength = 8000;
    const truncatedSource = sourceCode.length > maxSourceLength 
      ? sourceCode.substring(0, maxSourceLength) + '\n# ... (truncated)'
      : sourceCode;
    const prompt = `Generate COMPLETE pytest tests. DO NOT TRUNCATE.

CRITICAL PYTHON REQUIREMENTS:

1. **File Structure (MANDATORY):**
   \`\`\`python
   import pytest
   from ${fileName.replace('.py', '')} import function_name, ClassName
   
   def test_something():
       # Test code with 4-space indentation
       assert result == expected
   \`\`\`

2. **Indentation Rules (CRITICAL):**
   - Use 4 spaces (NOT tabs)
   - Imports: NO indentation
   - Test functions: NO indentation
   - Test body: 4 spaces indentation
   - DO NOT use 'self' parameter in test functions

3. **What NOT to do:**
   ❌ DO NOT: \`    import pytest\` (indented import)
   ❌ DO NOT: \`    def test_x(self):\` (indented def or self parameter)
   ❌ DO NOT: \`def test_x():\n        assert x\` (8-space indent)
   ❌ DO NOT: Repeat imports before each test
   ❌ DO NOT: Leave incomplete tests without assertions

4. **What TO do:**
   ✅ DO: \`import pytest\` (at top, no indent)
   ✅ DO: \`def test_x():\` (no self, no indent)
   ✅ DO: \`    assert x == y\` (4-space indent)
   ✅ DO: Complete every test you start
   ✅ DO: Include assertions in every test

5. **Correct Example:**
   \`\`\`python
   import pytest
   from example import add, divide
   
   def test_add_positive():
       result = add(2, 3)
       assert result == 5
   
   def test_divide_by_zero():
       with pytest.raises(ValueError):
           divide(10, 0)
   \`\`\`

6. **Test Quality:**
   - Generate ${Math.min(testCount, 10)} COMPLETE tests
   - Every test MUST have at least one assertion
   - If running out of space: fewer complete tests > many incomplete
   - Test edge cases and error conditions

**Source Code to Test:**
\`\`\`python
${truncatedSource}
\`\`\`

**File Name:** ${fileName}

REMEMBER:
- Imports at top (no indentation)
- Test functions: def test_name(): (no self, no indentation)
- Test body: 4 spaces indentation
- Complete ALL tests you start
- Every test needs an assertion

Generate ${Math.min(testCount, 10)} COMPLETE pytest tests now:`;
    return prompt;
  }

  static generateFunctionPrompt(sourceCode, fileName, functions) {
    const source = sourceCode.length > 6000 
      ? sourceCode.substring(0, 6000) + '\n# ...'
      : sourceCode;
    const moduleName = fileName.replace('.py', '');
    const funcList = functions.join(', ');
    return `Generate COMPLETE pytest tests. DO NOT TRUNCATE.

Module: ${fileName}
Functions to test: ${funcList}

REQUIRED FORMAT (use EXACTLY):
\`\`\`python
import pytest
from ${moduleName} import ${funcList}

def test_${functions[0]}_basic():
    result = ${functions[0]}(args)
    assert result == expected

def test_${functions[0]}_edge_case():
    result = ${functions[0]}(edge_args)
    assert result == edge_expected
\`\`\`

CRITICAL RULES:
- NO indentation for imports
- NO indentation for def test_
- NO 'self' parameter
- 4 spaces for test body
- Complete EVERY test
- Include assertions

Source Code:
\`\`\`python
${source}
\`\`\`

Generate 8-10 COMPLETE tests:`;
  }

  static generateClassPrompt(sourceCode, fileName, className) {
    const source = sourceCode.length > 6000 
      ? sourceCode.substring(0, 6000) + '\n# ...'
      : sourceCode;
    const moduleName = fileName.replace('.py', '');
    return `Generate COMPLETE pytest tests for Python class. DO NOT TRUNCATE.

Class: ${className}

REQUIRED FORMAT:
\`\`\`python
import pytest
from ${moduleName} import ${className}

def test_${className.toLowerCase()}_creation():
    obj = ${className}()
    assert obj is not None

def test_${className.toLowerCase()}_method():
    obj = ${className}()
    result = obj.method()
    assert result == expected
\`\`\`

CRITICAL RULES:
- Create instance in EACH test (no shared state)
- NO 'self' parameter in test functions
- 4-space indentation for test body
- Complete every test with assertions

Source Code:
\`\`\`python
${source}
\`\`\`

Generate 8-10 COMPLETE tests:`;
  }

  static detectTruncation(aiResponse) {
    const issues = [];
    const defStarts = (aiResponse.match(/^def test_/gm) || []).length;
    const assertCount = (aiResponse.match(/\bassert\b/g) || []).length;
    if (defStarts > assertCount) {
      issues.push({
        type: 'missing_assertions',
        message: `${defStarts} tests defined but only ${assertCount} assertions found`,
        severity: 'error'
      });
    }
    const lines = aiResponse.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.trim() && lastLine.includes('def ')) {
      issues.push({
        type: 'truncated_function',
        message: 'Response ends with incomplete function definition',
        severity: 'error'
      });
    }
    const indentedImports = (aiResponse.match(/^\s+(import |from )/gm) || []).length;
    if (indentedImports > 0) {
      issues.push({
        type: 'indented_imports',
        message: `${indentedImports} imports are incorrectly indented`,
        severity: 'warning'
      });
    }
    const selfInTests = (aiResponse.match(/def test_\w+\(self\)/g) || []).length;
    if (selfInTests > 0) {
      issues.push({
        type: 'self_parameter',
        message: `${selfInTests} test functions incorrectly use 'self' parameter`,
        severity: 'warning'
      });
    }
    return {
      isTruncated: issues.some(i => i.severity === 'error'),
      issues,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }
}

module.exports = PythonAIPromptGenerator;
