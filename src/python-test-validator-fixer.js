/*
 * Python Test File Validator and Fixer
 * Fixes AI-generated pytest tests
 */

const fs = require('fs');
const path = require('path');

class PythonTestFixer {
  constructor(sourceFilePath, generatedTestContent) {
    this.sourceFilePath = sourceFilePath;
    this.generatedTestContent = generatedTestContent;
    this.sourceContent = '';
    this.exports = {
      functions: [],
      classes: [],
      moduleType: null
    };
  }

  async fix() {
    try {
      this.sourceContent = fs.readFileSync(this.sourceFilePath, 'utf-8');
      this.analyzeSourceFile();
      let content = this.preprocessContent(this.generatedTestContent);
      let fixedContent = this.fixTestContent(content);
      const validation = await this.validatePythonSyntax(fixedContent);
      if (!validation.valid) {
        console.log('⚠️  Python syntax validation failed, attempting repair...');
        fixedContent = this.repairPythonSyntax(fixedContent);
      }
      return {
        success: true,
        content: fixedContent,
        exports: this.exports,
        warnings: validation.valid ? [] : ['Python syntax was repaired']
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        originalContent: this.generatedTestContent
      };
    }
  }

  analyzeSourceFile() {
    const content = this.sourceContent;
    const funcMatches = content.matchAll(/^def\s+(\w+)\s*\(/gm);
    for (const match of funcMatches) {
      this.exports.functions.push(match[1]);
    }
    const classMatches = content.matchAll(/^class\s+(\w+)/gm);
    for (const match of classMatches) {
      this.exports.classes.push(match[1]);
    }
    if (this.exports.classes.length > 0 && this.exports.functions.length === 0) {
      this.exports.moduleType = 'class';
    } else if (this.exports.functions.length > 0 && this.exports.classes.length === 0) {
      this.exports.moduleType = 'functions';
    } else if (this.exports.classes.length > 0 && this.exports.functions.length > 0) {
      this.exports.moduleType = 'mixed';
    } else {
      this.exports.moduleType = 'unknown';
    }
  }

  preprocessContent(content) {
    content = content.replace(/^\s+(import\s+|from\s+)/gm, '$1');
    content = content.replace(/def\s+(test_\w+)\s*\(\s*self\s*\)/g, 'def $1()');
    content = content.replace(/^\s{4,}def\s+test_/gm, 'def test_');
    return content;
  }

  fixTestContent(content) {
    const lines = content.split('\n');
    const nonImportLines = [];
    let lastImport = null;
    for (let line of lines) {
      if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
        lastImport = line.trim();
      } else if (line.trim()) {
        nonImportLines.push(line);
      }
    }
    const tests = this.extractPythonTests(nonImportLines.join('\n'));
    const importStatement = this.generateImportStatement();
    const fixedContent = this.reconstructPythonTestFile(importStatement, tests);
    return fixedContent;
  }

  extractPythonTests(content) {
    const tests = [];
    const lines = content.split('\n');
    let currentTest = null;
    let indentLevel = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const testMatch = trimmed.match(/^def\s+(test_\w+)\s*\(\s*\)\s*:/);
      if (testMatch) {
        if (currentTest) {
          tests.push(currentTest);
        }
        currentTest = {
          name: testMatch[1],
          body: [],
          docstring: null
        };
        indentLevel = line.search(/\S/);
        continue;
      }
      if (currentTest) {
        if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
          if (!currentTest.docstring) {
            currentTest.docstring = trimmed;
          } else {
            currentTest.docstring += ' ' + trimmed;
          }
          if (trimmed.endsWith('"""') || trimmed.endsWith("'''")) {
            continue;
          }
        }
        if (!trimmed || trimmed.startsWith('def ') || trimmed.startsWith('class ')) {
          if (currentTest.body.length > 0) {
            tests.push(currentTest);
            currentTest = null;
          }
          if (trimmed.startsWith('def ')) {
            i--;
          }
          continue;
        }
        currentTest.body.push(trimmed);
      }
    }
    if (currentTest && currentTest.body.length > 0) {
      tests.push(currentTest);
    }
    return tests;
  }

  generateImportStatement() {
    const moduleName = path.basename(this.sourceFilePath, '.py');
    if (this.exports.moduleType === 'class' && this.exports.classes.length > 0) {
      return `from ${moduleName} import ${this.exports.classes.join(', ')}`;
    } else if (this.exports.moduleType === 'functions' && this.exports.functions.length > 0) {
      return `from ${moduleName} import ${this.exports.functions.join(', ')}`;
    } else if (this.exports.moduleType === 'mixed') {
      const allExports = [...this.exports.classes, ...this.exports.functions];
      return `from ${moduleName} import ${allExports.join(', ')}`;
    } else {
      return `import ${moduleName}`;
    }
  }

  reconstructPythonTestFile(importStatement, tests) {
    let output = '';
    output += 'import pytest\n';
    output += importStatement + '\n\n';
    output += '"""\n';
    output += 'Generated test suite\n';
    output += '"""\n\n';
    tests.forEach((test, index) => {
      output += `def ${test.name}():\n`;
      let addedBody = false;
      if (test.docstring) {
        output += `    ${test.docstring}\n`;
        // If there is no body, add an indented line after the docstring
        if (!test.body || test.body.length === 0) {
          output += '    assert True  # TODO: Implement test\n';
          addedBody = true;
        }
      }
      if (test.body && test.body.length > 0) {
        test.body.forEach(line => {
          output += `    ${line.trim()}\n`;
        });
        addedBody = true;
      }
      // If no docstring and no body, add a placeholder
      if (!addedBody) {
        output += '    assert True  # TODO: Implement test\n';
      }
      if (index < tests.length - 1) {
        output += '\n';
      }
    });
    return output;
  }

  async validatePythonSyntax(content) {
    try {
      const issues = [];
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('\t') && line.includes('    ')) {
          issues.push(`Line ${i + 1}: Mixed tabs and spaces`);
        }
        if (line.trim().startsWith('def ') || line.trim().startsWith('class ')) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.trim() && !nextLine.startsWith('    ') && !nextLine.trim().startsWith('"""')) {
            issues.push(`Line ${i + 2}: Expected indented block after ${line.trim().split(' ')[0]}`);
          }
        }
      }
      const singleQuotes = (content.match(/'/g) || []).length;
      const doubleQuotes = (content.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0) {
        issues.push('Unbalanced single quotes');
      }
      if (doubleQuotes % 2 !== 0) {
        issues.push('Unbalanced double quotes');
      }
      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      return {
        valid: false,
        issues: [error.message]
      };
    }
  }

  repairPythonSyntax(content) {
    let lines = content.split('\n');
    let fixed = [];
    let inFunction = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('def ')) {
        fixed.push(line);
        inFunction = true;
        continue;
      }
      if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
        fixed.push(trimmed);
        continue;
      }
      if (inFunction) {
        if (trimmed === '') {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.trim().startsWith('def ')) {
            inFunction = false;
          }
          fixed.push('');
        } else if (trimmed.startsWith('def ') || trimmed.startsWith('class ')) {
          inFunction = trimmed.startsWith('def ');
          fixed.push(line);
        } else {
          if (!line.startsWith('    ')) {
            fixed.push('    ' + trimmed);
          } else {
            fixed.push(line);
          }
        }
      } else {
        fixed.push(line);
      }
    }
    return fixed.join('\n');
  }
}

async function fixPythonTestFile(sourceFilePath, generatedTestContent) {
  const fixer = new PythonTestFixer(sourceFilePath, generatedTestContent);
  return await fixer.fix();
}

module.exports = { PythonTestFixer, fixPythonTestFile };
