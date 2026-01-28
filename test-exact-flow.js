/**
 * Simulates the EXACT flow of the extension to find the bug
 */

// Step 1: Simulated fixJavaScriptStructure output
const fixedResponse = `const { add, divide, findMax } = require('./example');

describe('example Tests', () => {
  test('should correctly add two positive integers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('should correctly add a positive and a negative integer', () => {
    expect(add(10, -3)).toBe(7);
  });

  test('should return null for null', () => {
    expect(findMax(null)).toBeNull();
  });
});
`;

console.log('='.repeat(60));
console.log('STEP 1: Fixed Response from fixJavaScriptStructure');
console.log('='.repeat(60));
console.log(fixedResponse);

// Step 2: Simulate cleanGeneratedTests
function cleanGeneratedTests(rawCode, language) {
    let cleaned = rawCode;
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```[\w]*\n?/g, '').trim();
    
    if (language === 'javascript') {
        const lines = cleaned.split('\n');
        const imports = new Set();
        const importLines = [];
        const codeLines = [];
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if ((trimmed.startsWith('const ') || trimmed.startsWith('import ')) && 
                (trimmed.includes('require(') || trimmed.includes('from '))) {
                const normalized = trimmed.replace(/\s+/g, ' ');
                if (!imports.has(normalized)) {
                    imports.add(normalized);
                    importLines.push(line);
                }
            } else if (trimmed) {
                codeLines.push(line);
            }
        }
        
        cleaned = [...importLines, '', ...codeLines].join('\n');
        
        // Only add describe wrapper if missing
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
    }
    
    return cleaned;
}

console.log('\n' + '='.repeat(60));
console.log('STEP 2: After cleanGeneratedTests');
console.log('='.repeat(60));
const cleanCode = cleanGeneratedTests(fixedResponse, 'javascript');
console.log(cleanCode);

// Step 3: Simulate extractJestTests
function extractJestTests(code, imports) {
    const tests = [];
    const testStartRegex = /(?:test|it)\s*\(\s*(['"`])((?:(?!\1).)*)\1\s*,\s*(?:async\s+)?\(\s*\)\s*=>\s*\{/g;
    
    let match;
    while ((match = testStartRegex.exec(code)) !== null) {
        const testName = match[2];
        const startIndex = match.index;
        const bodyStartIndex = match.index + match[0].length;
        
        let braceCount = 1;
        let endIndex = bodyStartIndex;
        let inString = null;
        
        for (let i = bodyStartIndex; i < code.length && braceCount > 0; i++) {
            const char = code[i];
            
            if (!inString && (char === '"' || char === "'" || char === '`')) {
                inString = char;
                continue;
            }
            if (inString && char === inString) {
                let escapeCount = 0;
                let j = i - 1;
                while (j >= 0 && code[j] === '\\') {
                    escapeCount++;
                    j--;
                }
                if (escapeCount % 2 === 0) inString = null;
                continue;
            }
            if (inString) continue;
            
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            endIndex = i;
        }
        
        let fullEndIndex = endIndex + 1;
        while (fullEndIndex < code.length) {
            const char = code[fullEndIndex];
            if (char === ')') {
                fullEndIndex++;
                if (fullEndIndex < code.length && code[fullEndIndex] === ';') fullEndIndex++;
                break;
            } else if (char === ' ' || char === '\n' || char === '\t') {
                fullEndIndex++;
            } else {
                break;
            }
        }
        
        const testCode = code.substring(startIndex, fullEndIndex).trim();
        const fullTestCode = imports ? `${imports}\n\n${testCode}` : testCode;
        
        tests.push({
            name: testName,
            code: fullTestCode,
        });
    }
    
    return tests;
}

console.log('\n' + '='.repeat(60));
console.log('STEP 3: Extract Jest Tests');
console.log('='.repeat(60));

const lines = cleanCode.split('\n');
const importLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.startsWith('import ') || 
           trimmed.startsWith('const ') && trimmed.includes('require(');
});
const imports = importLines.join('\n');
console.log('Imports:', imports);

const testCases = extractJestTests(cleanCode, imports);
console.log(`\nExtracted ${testCases.length} tests:`);
testCases.forEach((t, i) => {
    console.log(`\n--- Test ${i + 1}: "${t.name}" ---`);
    console.log(t.code);
});

// Step 4: Simulate rebuildFullCode
function rebuildFullCode(tests, language) {
    if (tests.length === 0) return '';
    
    const firstTest = tests[0];
    const importMatch = firstTest.code.match(/^(import .+?;|const .+? = require.+?;|from .+? import .+)/m);
    const importLine = importMatch ? importMatch[0] : '';
    
    const testBodies = tests.map(t => {
        let body = t.code;
        if (importMatch) {
            body = body.replace(importMatch[0], '').trim();
        }
        return body;
    });
    
    if (language === 'javascript') {
        const cleanedBodies = testBodies.map(body => {
            return body
                .replace(/^\s*(const\s+\{[^}]+\}\s*=\s*require\([^)]*\);?|import\s+[^;]+;?)\s*/m, '')
                .trim();
        });
        
        const indentedTests = cleanedBodies.map(tb => {
            const lines = tb.split('\n');
            return lines.map((line, idx) => {
                const trimmed = line.trim();
                if (trimmed.length === 0) return '';
                
                if (idx === 0) {
                    return '  ' + trimmed;
                }
                else if (trimmed === '});') {
                    return '  ' + trimmed;
                }
                else {
                    return '    ' + trimmed;
                }
            }).join('\n');
        }).join('\n\n');
        
        return `${importLine}\n\ndescribe('Generated Tests', () => {\n${indentedTests}\n});`;
    }
    
    return testBodies.join('\n\n');
}

console.log('\n' + '='.repeat(60));
console.log('STEP 4: Rebuild Full Code');
console.log('='.repeat(60));
const finalCode = rebuildFullCode(testCases, 'javascript');
console.log(finalCode);

// Validation
console.log('\n' + '='.repeat(60));
console.log('VALIDATION');
console.log('='.repeat(60));

const braceBalance = (finalCode.match(/{/g) || []).length - (finalCode.match(/}/g) || []).length;
console.log(`Brace balance: ${braceBalance}`);

const strayBraces = finalCode.match(/^\s*\}\s*\)(?!;)/gm) || [];
console.log(`Stray }) without semicolon: ${strayBraces.length}`);

try {
    new Function(finalCode);
    console.log('✅ JavaScript syntax is VALID');
} catch (e) {
    console.log('❌ JavaScript syntax ERROR:', e.message);
}
