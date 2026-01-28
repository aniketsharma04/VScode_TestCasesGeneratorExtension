/**
 * Test with REALISTIC AI output including edge cases that might break things
 */

// This is what AI might ACTUALLY generate with problematic patterns
const rawAIResponse = `\`\`\`javascript
const { add, findMax, divide } = require('./example');

describe('add function tests', () => {
  test('should correctly add two positive integers', () => {
    expect(add(2, 3)).toBe(5);
  });
})

describe('findMax function tests', () => {
  test('should return the maximum from an array', () => {
    expect(findMax([1, 5, 3])).toBe(5);
  });
  
  test('should return null for null input', () => {
    expect(findMax(null)).toBeNull();
  });
})

const { add } = require('./example');

describe('divide tests', () => {
  check('should divide correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });
})

test('standalone test outside describe', () => {
  expect(add(1, 1)).toBe(2);
});
\`\`\`

Here are additional tests:

\`\`\`javascript
const { add } = require('./example');

describe('edge cases', () => {
  example('edge case test', () => {
    expect(add(0, 0)).toBe(0);
  });
})
})
\`\`\`
`;

console.log('='.repeat(60));
console.log('RAW AI RESPONSE (with problems):');
console.log('='.repeat(60));
console.log(rawAIResponse);

// Now run through the FULL pipeline

// STEP 1: jestFixInvalidFunctions
function jestFixInvalidFunctions(code) {
    return code
        .replace(/\bcheck\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bexample\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bspec\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bcase\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\btestCase\s*\(\s*(['"`])/g, 'test($1');
}

// STEP 2: jestFixDuplicateImports
function jestFixDuplicateImports(code) {
    const lines = code.split('\n');
    let importSeen = false;
    
    return lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.match(/^(?:const|let|var)\s+.*=\s*require\s*\(/) || 
            trimmed.match(/^import\s+/)) {
            if (importSeen) {
                console.log('[AutoFix] Removing duplicate import:', trimmed.substring(0, 50));
                return false;
            }
            importSeen = true;
        }
        return true;
    }).join('\n');
}

// STEP 3: jestFixExtraBraces (robust version with string handling)
function jestFixExtraBraces(code) {
    let balance = 0;
    let result = '';
    let i = 0;
    let inString = null;
    let inLineComment = false;
    let inBlockComment = false;
    
    while (i < code.length) {
        const char = code[i];
        const nextChar = i + 1 < code.length ? code[i + 1] : '';
        
        // Line comments
        if (!inString && !inBlockComment && char === '/' && nextChar === '/') {
            inLineComment = true;
            result += char;
            i++;
            continue;
        }
        if (inLineComment && char === '\n') {
            inLineComment = false;
            result += char;
            i++;
            continue;
        }
        
        // Block comments
        if (!inString && !inLineComment && char === '/' && nextChar === '*') {
            inBlockComment = true;
            result += char;
            i++;
            continue;
        }
        if (inBlockComment && char === '*' && nextChar === '/') {
            inBlockComment = false;
            result += char + nextChar;
            i += 2;
            continue;
        }
        
        if (inLineComment || inBlockComment) {
            result += char;
            i++;
            continue;
        }
        
        // String handling
        if (!inString && (char === '"' || char === "'" || char === '`')) {
            inString = char;
            result += char;
            i++;
            continue;
        }
        if (inString && char === inString) {
            let escapeCount = 0;
            let j = i - 1;
            while (j >= 0 && code[j] === '\\') {
                escapeCount++;
                j--;
            }
            if (escapeCount % 2 === 0) {
                inString = null;
            }
            result += char;
            i++;
            continue;
        }
        if (inString) {
            result += char;
            i++;
            continue;
        }
        
        // Brace handling
        if (char === '{') {
            balance++;
            result += char;
        } else if (char === '}') {
            if (balance > 0) {
                balance--;
                result += char;
            } else {
                console.log('[AutoFix] Removing orphan } at position', i);
                // Skip the } and any following ) ; newline
                while (i + 1 < code.length) {
                    const nextC = code[i + 1];
                    if (nextC === ')' || nextC === ';') {
                        i++;
                    } else if (nextC === ' ' || nextC === '\t') {
                        i++;
                    } else if (nextC === '\n') {
                        i++;
                        break;
                    } else {
                        break;
                    }
                }
            }
        } else {
            result += char;
        }
        i++;
    }
    
    return result;
}

// STEP 4: jestExtractTestBlocks
function jestExtractTestBlocks(code) {
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
        let inLineComment = false;
        let inBlockComment = false;
        
        for (let i = bodyStartIndex; i < code.length && braceCount > 0; i++) {
            const char = code[i];
            const nextChar = i + 1 < code.length ? code[i + 1] : '';
            
            if (!inString && !inBlockComment && char === '/' && nextChar === '/') {
                inLineComment = true;
                i++;
                continue;
            }
            if (inLineComment && char === '\n') {
                inLineComment = false;
                continue;
            }
            if (!inString && !inLineComment && char === '/' && nextChar === '*') {
                inBlockComment = true;
                i++;
                continue;
            }
            if (inBlockComment && char === '*' && nextChar === '/') {
                inBlockComment = false;
                i++;
                continue;
            }
            if (inLineComment || inBlockComment) continue;
            
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
        
        const body = code.substring(bodyStartIndex, endIndex).trim();
        const fullBlock = code.substring(startIndex, fullEndIndex).trim();
        
        tests.push({ name: testName, body, fullBlock });
    }
    
    return tests;
}

// STEP 5: jestFixDuplicateTests
function jestFixDuplicateTests(testBlocks) {
    const seen = new Set();
    const uniqueTests = [];
    
    for (const test of testBlocks) {
        const normalizedBody = test.body.replace(/\s+/g, '');
        const signature = test.name + '|' + normalizedBody;
        
        if (seen.has(signature)) {
            console.log('[AutoFix] Removing duplicate test:', test.name);
            continue;
        }
        
        const normalizedName = test.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        let isDuplicate = false;
        for (const existing of uniqueTests) {
            const existingName = existing.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedName === existingName) {
                console.log('[AutoFix] Removing duplicate name:', test.name);
                isDuplicate = true;
                break;
            }
        }
        
        if (!isDuplicate) {
            seen.add(signature);
            uniqueTests.push(test);
        }
    }
    
    return uniqueTests;
}

// STEP 6: jestRebuildTestFile
function jestRebuildTestFile(testBlocks, importStatement, moduleName) {
    if (testBlocks.length === 0) {
        return '';
    }
    
    const indentedTests = testBlocks.map(test => {
        const lines = test.fullBlock.split('\n');
        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.length === 0) return '';
            
            if (idx === 0) {
                return '  ' + trimmed;
            } else if (trimmed === '});') {
                return '  ' + trimmed;
            } else {
                return '    ' + trimmed;
            }
        }).join('\n');
    }).join('\n\n');
    
    return `${importStatement}

describe('${moduleName} Tests', () => {
${indentedTests}
});
`;
}

// ============================================================================
// RUN THE FULL PIPELINE
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('RUNNING FULL PIPELINE');
console.log('='.repeat(60));

// Remove markdown code blocks first
let code = rawAIResponse.replace(/```[\w]*\n?/g, '').trim();
console.log('\n1. After removing markdown blocks');

console.log('\n2. Fix invalid functions');
code = jestFixInvalidFunctions(code);

console.log('\n3. Fix duplicate imports');
code = jestFixDuplicateImports(code);

console.log('\n4. Fix extra braces');
code = jestFixExtraBraces(code);

console.log('\n5. Extract test blocks');
let testBlocks = jestExtractTestBlocks(code);
console.log(`   Found ${testBlocks.length} tests:`);
testBlocks.forEach((t, i) => console.log(`   ${i + 1}. "${t.name}"`));

console.log('\n6. Remove duplicates');
testBlocks = jestFixDuplicateTests(testBlocks);
console.log(`   After dedup: ${testBlocks.length} tests`);

console.log('\n7. Rebuild');
const importMatch = rawAIResponse.match(/const\s+\{[^}]+\}\s*=\s*require\s*\([^)]+\)/);
const importStatement = importMatch ? importMatch[0] + ';' : "const { } = require('./example');";
const result = jestRebuildTestFile(testBlocks, importStatement, 'example');

console.log('\n' + '='.repeat(60));
console.log('FINAL RESULT:');
console.log('='.repeat(60));
console.log(result);

// VALIDATION
console.log('\n' + '='.repeat(60));
console.log('VALIDATION:');
console.log('='.repeat(60));

const braceBalance = (result.match(/{/g) || []).length - (result.match(/}/g) || []).length;
console.log(`Brace balance: ${braceBalance} (should be 0)`);

const importCount = (result.match(/require\s*\(/g) || []).length;
console.log(`Import count: ${importCount} (should be 1)`);

const testCount = (result.match(/\btest\s*\(/g) || []).length;
console.log(`Test count: ${testCount}`);

const describeCount = (result.match(/\bdescribe\s*\(/g) || []).length;
console.log(`Describe count: ${describeCount} (should be 1)`);

const strayBraces = result.match(/^\s*\}\s*\)(?!;)/gm) || [];
console.log(`Stray }) without semicolon: ${strayBraces.length} (should be 0)`);

if (braceBalance === 0 && importCount === 1 && describeCount === 1 && testCount > 0 && strayBraces.length === 0) {
    console.log('\n✅ ALL VALIDATIONS PASSED!');
} else {
    console.log('\n❌ VALIDATION FAILED!');
}

// Try to parse
console.log('\n' + '='.repeat(60));
console.log('SYNTAX CHECK:');
console.log('='.repeat(60));
try {
    new Function(result);
    console.log('✅ JavaScript syntax is VALID');
} catch (e) {
    console.log('❌ JavaScript syntax ERROR:', e.message);
    
    // Show problematic lines
    const lines = result.split('\n');
    const lineNum = parseInt(e.message.match(/line (\d+)/)?.[1] || '0');
    if (lineNum > 0) {
        console.log('\nContext around error:');
        for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 3); i++) {
            const marker = i === lineNum - 1 ? '>>>' : '   ';
            console.log(`${marker} ${i + 1}: ${lines[i]}`);
        }
    }
}
