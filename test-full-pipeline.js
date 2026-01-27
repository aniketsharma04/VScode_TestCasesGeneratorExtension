/**
 * Test the FULL pipeline including the problematic nested describes
 * that cause the `})` issues
 */

// Simulated broken input - similar to what AI generates with nested describes
const brokenCode = `const { add, divide, findMax } = require('./example');

describe('add function', () => {
  test('should correctly add two positive integers', () => {
      expect(add(2, 3)).toBe(5);
    });
  test('should correctly add a positive and a negative integer', () => {
      expect(add(10, -3)).toBe(7);
    });
})

const { add, divide, findMax } = require('./example');

describe('findMax function', () => {
  test('should return null for null', () => {
      expect(findMax(null)).toBeNull();
    });
})

test('should add floating-point numbers', () => {
    expect(add(2.5, 3.5)).toBe(6.0);
});

const { add, divide, findMax } = require('./example');

check('should handle edge cases', () => {
    expect(add(0, 0)).toBe(0);
});
})`;

console.log('='.repeat(60));
console.log('BROKEN INPUT:');
console.log('='.repeat(60));
console.log(brokenCode);
console.log('\n');

// ============================================================================
// STEP 1: Fix invalid functions (check -> test)
// ============================================================================
function jestFixInvalidFunctions(code) {
    return code
        .replace(/\bcheck\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bexample\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bspec\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\bcase\s*\(\s*(['"`])/g, 'test($1')
        .replace(/\btestCase\s*\(\s*(['"`])/g, 'test($1');
}

// ============================================================================
// STEP 2: Fix duplicate imports
// ============================================================================
function jestFixDuplicateImports(code) {
    const lines = code.split('\n');
    let importSeen = false;
    
    return lines.filter(line => {
        const trimmed = line.trim();
        if (trimmed.match(/^(?:const|let|var)\s+.*=\s*require\s*\(/) || 
            trimmed.match(/^import\s+/)) {
            if (importSeen) {
                console.log('[AutoFix] Removing duplicate import');
                return false;
            }
            importSeen = true;
        }
        return true;
    }).join('\n');
}

// ============================================================================
// STEP 3: Fix orphan braces (with string/comment awareness)
// ============================================================================
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

// ============================================================================
// STEP 4: Extract test blocks with proper brace matching
// ============================================================================
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

// ============================================================================
// STEP 5: Deduplicate tests
// ============================================================================
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

// ============================================================================
// STEP 6: Rebuild with proper indentation
// ============================================================================
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

console.log('STEP 1: Fix invalid functions');
let fixed = jestFixInvalidFunctions(brokenCode);

console.log('\nSTEP 2: Fix duplicate imports');
fixed = jestFixDuplicateImports(fixed);

console.log('\nSTEP 3: Fix orphan braces');
fixed = jestFixExtraBraces(fixed);

console.log('\nSTEP 4: Extract test blocks');
let testBlocks = jestExtractTestBlocks(fixed);
console.log(`Found ${testBlocks.length} test blocks`);
testBlocks.forEach((t, i) => console.log(`  ${i + 1}. "${t.name}"`));

console.log('\nSTEP 5: Deduplicate');
testBlocks = jestFixDuplicateTests(testBlocks);
console.log(`After dedup: ${testBlocks.length} unique tests`);

console.log('\nSTEP 6: Rebuild');
const importMatch = brokenCode.match(/(?:const|let|var)\s+\{[^}]+\}\s*=\s*require\s*\([^)]+\)\s*;?/);
const importStatement = importMatch ? importMatch[0].trim().replace(/;?$/, ';') : "const { } = require('./example');";
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

// Check for stray })
const strayBraces = result.match(/^\s*\}\s*\)(?!;)/gm) || [];
console.log(`Stray }) without semicolon: ${strayBraces.length} (should be 0)`);

if (braceBalance === 0 && importCount === 1 && describeCount === 1 && testCount > 0 && strayBraces.length === 0) {
    console.log('\n✅ ALL VALIDATIONS PASSED!');
} else {
    console.log('\n❌ VALIDATION FAILED!');
}

// Try to parse with a simple syntax check
console.log('\n' + '='.repeat(60));
console.log('SYNTAX CHECK:');
console.log('='.repeat(60));
try {
    new Function(result);
    console.log('✅ JavaScript syntax is VALID');
} catch (e) {
    console.log('❌ JavaScript syntax ERROR:', e.message);
}
