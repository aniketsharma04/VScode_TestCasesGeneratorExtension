/**
 * Improved Test Extraction Strategy
 * Tries harder to preserve test logic before falling back to placeholders
 */

class ImprovedTestExtractor {
  /**
   * Multi-stage extraction with fallbacks
   */
  static extractTests(content) {
    // Stage 1: Try perfect regex match
    const perfectTests = this.extractWithRegex(content);
    if (perfectTests.length > 0 && this.validateTests(perfectTests)) {
      console.log('✅ Stage 1: Perfect extraction');
      return perfectTests;
    }
    
    // Stage 2: Try line-by-line with brace tracking
    const parsedTests = this.extractLineByLine(content);
    if (parsedTests.length > 0 && this.validateTests(parsedTests)) {
      console.log('✅ Stage 2: Line-by-line extraction');
      return parsedTests;
    }
    
    // Stage 3: Try aggressive extraction with cleanup
    const aggressiveTests = this.extractAggressively(content);
    if (aggressiveTests.length > 0) {
      console.log('⚠️  Stage 3: Aggressive extraction (may lose some logic)');
      return aggressiveTests;
    }
    
    // Stage 4: Lenient - preserve what we can
    const lenientTests = this.extractLenient(content);
    if (lenientTests.length > 0) {
      console.log('⚠️  Stage 4: Lenient extraction (partial logic preserved)');
      return lenientTests;
    }
    
    // Stage 5: Last resort - placeholders
    console.log('❌ Stage 5: Placeholder tests (logic lost)');
    return this.createPlaceholders(content);
  }

  /**
   * Stage 1: Perfect regex extraction
   */
  static extractWithRegex(content) {
    const tests = [];
    const testRegex = /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*?)\n\s*\}\s*\);?/g;
    
    let match;
    while ((match = testRegex.exec(content)) !== null) {
      tests.push({
        description: match[1],
        body: match[2],
        quality: 'perfect'
      });
    }
    
    return tests;
  }

  /**
   * Stage 2: Line-by-line with better logic preservation
   */
  static extractLineByLine(content) {
    const tests = [];
    const lines = content.split('\n');
    let currentTest = null;
    let braceDepth = 0;
    let parenDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start of test
      const testStart = line.match(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (testStart) {
        if (currentTest) {
          // Save incomplete previous test
          tests.push(currentTest);
        }
        
        currentTest = {
          description: testStart[1],
          body: '',
          quality: 'good'
        };
        
        // Check if test starts on same line
        const arrowMatch = line.match(/\)\s*=>\s*\{/);
        if (arrowMatch) {
          braceDepth = 1;
        }
        continue;
      }
      
      if (currentTest) {
        // Count braces and parens
        for (let char of line) {
          if (char === '{') braceDepth++;
          else if (char === '}') braceDepth--;
          else if (char === '(') parenDepth++;
          else if (char === ')') parenDepth--;
        }
        
        // Add line to body
        currentTest.body += line + '\n';
        
        // Check if test is complete
        if (braceDepth <= 0 && parenDepth <= 0 && line.includes('});')) {
          tests.push(currentTest);
          currentTest = null;
          braceDepth = 0;
          parenDepth = 0;
        }
      }
    }
    
    // Save any remaining test
    if (currentTest && currentTest.body.trim()) {
      currentTest.quality = 'partial';
      tests.push(currentTest);
    }
    
    return tests;
  }

  /**
   * Stage 3: Aggressive extraction - tries to recover partial logic
   */
  static extractAggressively(content) {
    const tests = [];
    
    // Find all test descriptions
    const testMatches = [...content.matchAll(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g)];
    
    for (let i = 0; i < testMatches.length; i++) {
      const match = testMatches[i];
      const description = match[1];
      const startIndex = match.index;
      
      // Find end of this test (start of next test or end of file)
      const nextTestIndex = testMatches[i + 1]?.index || content.length;
      
      // Extract everything between this test and next
      let testContent = content.substring(startIndex, nextTestIndex);
      
      // Try to extract the body
      const bodyMatch = testContent.match(/\)\s*=>\s*\{([\s\S]*)/);
      if (bodyMatch) {
        let body = bodyMatch[1];
        
        // Try to close braces if needed
        const openBraces = (body.match(/\{/g) || []).length;
        const closeBraces = (body.match(/\}/g) || []).length;
        
        // Remove excess closing braces
        while (closeBraces > openBraces && body.includes('}')) {
          body = body.replace(/\}\s*$/, '');
        }
        
        tests.push({
          description,
          body: body.trim(),
          quality: 'recovered'
        });
      }
    }
    
    return tests;
  }

  /**
   * Stage 4: Lenient extraction - preserves partial logic
   */
  static extractLenient(content) {
    const tests = [];
    
    // Find test descriptions
    const testMatches = [...content.matchAll(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g)];
    
    for (const match of testMatches) {
      const description = match[1];
      const startIndex = match.index;
      
      // Try to find any expect statements nearby
      const nearby = content.substring(startIndex, startIndex + 500);
      const expectMatches = nearby.match(/expect\([^)]+\)[^;]+;?/g);
      
      let body;
      if (expectMatches && expectMatches.length > 0) {
        // Use the expect statements we found
        body = '    ' + expectMatches.join('\n    ');
      } else {
        // Look for any code between arrow and closing brace
        const codeMatch = nearby.match(/\)\s*=>\s*\{([^}]+)/);
        if (codeMatch) {
          body = '    ' + codeMatch[1].trim();
        } else {
          // Last resort: comment about what should be tested
          body = `    // TODO: Test ${description}\n    expect(true).toBe(true);`;
        }
      }
      
      tests.push({
        description,
        body,
        quality: 'partial'
      });
    }
    
    return tests;
  }

  /**
   * Stage 5: Create placeholder tests
   */
  static createPlaceholders(content) {
    const tests = [];
    
    // Find any test descriptions
    const testMatches = [...content.matchAll(/(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g)];
    
    if (testMatches.length > 0) {
      for (const match of testMatches) {
        tests.push({
          description: match[1],
          body: '    // TODO: Implement this test\n    expect(true).toBe(true);',
          quality: 'placeholder'
        });
      }
    } else {
      // No tests found at all - create a default one
      tests.push({
        description: 'default test',
        body: '    // Test implementation needed\n    expect(true).toBe(true);',
        quality: 'placeholder'
      });
    }
    
    return tests;
  }

  /**
   * Validate extracted tests
   */
  static validateTests(tests) {
    if (tests.length === 0) return false;
    
    // Check if tests have reasonable content
    let validCount = 0;
    for (const test of tests) {
      if (test.body && test.body.trim().length > 10) {
        validCount++;
      }
    }
    
    // At least 50% should be valid
    return validCount / tests.length >= 0.5;
  }

  /**
   * Add quality indicators to test output
   */
  static reconstructWithQualityIndicators(tests, importStatement, instanceCreation) {
    let output = importStatement + '\n\n';
    output += "describe('Generated Tests', () => {\n";
    
    if (instanceCreation) {
      output += '  ' + instanceCreation.replace(/\n/g, '\n  ') + '\n\n';
    }
    
    // Group by quality
    const perfect = tests.filter(t => t.quality === 'perfect');
    const good = tests.filter(t => t.quality === 'good');
    const recovered = tests.filter(t => t.quality === 'recovered');
    const partial = tests.filter(t => t.quality === 'partial');
    const placeholder = tests.filter(t => t.quality === 'placeholder');
    
    // Add perfect/good tests
    [...perfect, ...good].forEach(test => {
      output += `  test('${test.description.replace(/'/g, "\\'")}', () => {\n`;
      output += this.indentBody(test.body);
      output += '  });\n\n';
    });
    
    // Add recovered tests with warning
    if (recovered.length > 0) {
      output += '  // ⚠️  Tests below were recovered from malformed code\n';
      recovered.forEach(test => {
        output += `  test('${test.description.replace(/'/g, "\\'")}', () => {\n`;
        output += this.indentBody(test.body);
        output += '  });\n\n';
      });
    }
    
    // Add partial tests with warning
    if (partial.length > 0) {
      output += '  // ⚠️  Tests below have partial logic - please review\n';
      partial.forEach(test => {
        output += `  test('${test.description.replace(/'/g, "\\'")}', () => {\n`;
        output += this.indentBody(test.body);
        output += '  });\n\n';
      });
    }
    
    // Add placeholders with clear warning
    if (placeholder.length > 0) {
      output += '  // ❌ Tests below are placeholders - logic was lost\n';
      output += '  // TODO: Implement these tests manually\n';
      placeholder.forEach(test => {
        output += `  test('${test.description.replace(/'/g, "\\'")}', () => {\n`;
        output += this.indentBody(test.body);
        output += '  });\n\n';
      });
    }
    
    output += '});\n';
    
    return output;
  }

  static indentBody(body) {
    return body.split('\n').map(line => '    ' + line).join('\n') + '\n';
  }
}

module.exports = ImprovedTestExtractor;
