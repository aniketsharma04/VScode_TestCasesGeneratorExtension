/**
 * Test Generation Integration Module
 * Orchestrates AI test generation with validation and fixing
 */

const fs = require('fs');
const path = require('path');
const { TestFileFixer } = require('./test-validator-fixer');
const AIPromptGenerator = require('./ai-prompt-generator');

class TestGenerationOrchestrator {
  constructor(config = {}) {
    this.config = {
      maxRetries: 3,
      validateBeforeSave: true,
      autoFix: true,
      ...config
    };
  }

  /**
   * Analyze source file to understand its structure
   */
  analyzeSourceFile(sourceFilePath) {
    const content = fs.readFileSync(sourceFilePath, 'utf-8');
    const fileName = path.basename(sourceFilePath, path.extname(sourceFilePath));
    
    const analysis = {
      fileName,
      filePath: sourceFilePath,
      content,
      exports: {
        classes: [],
        functions: [],
        defaultExport: null,
        type: null // 'class', 'functions', 'mixed', 'unknown'
      }
    };
    
    // Find classes
    const classMatches = content.matchAll(/class\s+(\w+)/g);
    for (const match of classMatches) {
      analysis.exports.classes.push(match[1]);
    }
    
    // Find module.exports
    const defaultExportMatch = content.match(/module\.exports\s*=\s*(\w+)/);
    if (defaultExportMatch) {
      analysis.exports.defaultExport = defaultExportMatch[1];
    }
    
    // Find function exports
    const functionExportMatches = content.matchAll(/(?:module\.exports|exports)\.(\w+)\s*=/g);
    for (const match of functionExportMatches) {
      analysis.exports.functions.push(match[1]);
    }
    
    // Find object exports
    const objectExportMatch = content.match(/module\.exports\s*=\s*\{([^}]+)\}/);
    if (objectExportMatch) {
      const exports = objectExportMatch[1]
        .split(',')
        .map(e => e.trim().split(':')[0].trim())
        .filter(e => e);
      analysis.exports.functions.push(...exports);
    }
    
    // Determine type
    if (analysis.exports.classes.length > 0 && analysis.exports.functions.length === 0) {
      analysis.exports.type = 'class';
    } else if (analysis.exports.functions.length > 0 && analysis.exports.classes.length === 0) {
      analysis.exports.type = 'functions';
    } else if (analysis.exports.classes.length > 0 && analysis.exports.functions.length > 0) {
      analysis.exports.type = 'mixed';
    } else {
      analysis.exports.type = 'unknown';
    }
    
    return analysis;
  }

  /**
   * Generate optimized prompt based on source code analysis
   */
  generateOptimizedPrompt(analysis) {
    const { fileName, content, exports } = analysis;
    
    if (exports.type === 'class' && exports.defaultExport) {
      return AIPromptGenerator.generateClassPrompt(
        content,
        fileName,
        exports.defaultExport
      );
    } else if (exports.type === 'functions' && exports.functions.length > 0) {
      return AIPromptGenerator.generateFunctionPrompt(
        content,
        fileName,
        exports.functions
      );
    } else {
      return AIPromptGenerator.generatePrompt(content, fileName);
    }
  }

  /**
   * Main workflow: Generate and validate tests
   */
  async generateTests(sourceFilePath, aiGenerateFunction) {
    const result = {
      success: false,
      attempts: [],
      finalContent: null,
      testFilePath: null,
      errors: []
    };

    try {
      // Step 1: Analyze source file
      console.log('Analyzing source file...');
      const analysis = this.analyzeSourceFile(sourceFilePath);
      console.log(`✓ Found: ${analysis.exports.type} module`);
      console.log(`  - Classes: ${analysis.exports.classes.join(', ') || 'none'}`);
      console.log(`  - Functions: ${analysis.exports.functions.join(', ') || 'none'}`);
      
      // Step 2: Generate optimized prompt
      console.log('\n Generating optimized prompt...');
      const prompt = this.generateOptimizedPrompt(analysis);
      
      // Step 3: Call AI to generate tests (with retries)
      let generatedContent = null;
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        console.log(`\n Attempt ${attempt}: Calling AI to generate tests...`);
        
        try {
          generatedContent = await aiGenerateFunction(prompt);
          
          // Check for truncation using AIPromptGenerator.detectTruncation
          const truncationCheck = AIPromptGenerator.detectTruncation(generatedContent);
          if (truncationCheck.isTruncated) {
            console.log(`⚠️  Truncation detected (score: ${truncationCheck.score}/100):`);
            truncationCheck.issues.forEach(issue => {
              console.log(`   - ${issue.type}: ${issue.message}`);
            });
            
            // If score is too low, retry
            if (truncationCheck.score < 50 && attempt < this.config.maxRetries) {
              console.log(`   Retrying due to severe truncation...`);
              result.attempts.push({
                attempt,
                success: false,
                error: `Truncation detected (score: ${truncationCheck.score})`
              });
              continue; // Try again
            } else {
              console.log(`   Proceeding with truncated content (will be fixed)...`);
            }
          }
          
          result.attempts.push({
            attempt,
            success: true,
            contentLength: generatedContent.length,
            truncationScore: truncationCheck.score
          });
          console.log(`✓ AI generated ${generatedContent.length} characters (quality: ${truncationCheck.score}/100)`);
          break;
        } catch (error) {
          console.log(`✗ Attempt ${attempt} failed: ${error.message}`);
          result.attempts.push({
            attempt,
            success: false,
            error: error.message
          });
          
          if (attempt === this.config.maxRetries) {
            throw new Error(`AI generation failed after ${this.config.maxRetries} attempts`);
          }
        }
      }
      
      // Step 4: Validate and fix generated content
      if (this.config.autoFix) {
        console.log('\n🔧 Validating and fixing generated tests...');
        const fixer = new TestFileFixer(sourceFilePath, generatedContent);
        const fixResult = await fixer.fix();
        
        if (fixResult.success) {
          console.log('✓ Tests fixed successfully');
          generatedContent = fixResult.content;
        } else {
          console.log(`⚠ Fixer encountered issues: ${fixResult.error}`);
          console.log('  Proceeding with original content...');
          result.errors.push(`Fixer warning: ${fixResult.error}`);
        }
      }
      
      // Step 5: Final validation
      if (this.config.validateBeforeSave) {
        console.log('\n✅ Performing final validation...');
        const validation = await TestFileFixer.validate(generatedContent);
        
        if (!validation.valid) {
          console.log(`✗ Validation failed: ${validation.error}`);
          result.errors.push(`Validation error: ${validation.error}`);
          // Don't fail completely, save anyway for debugging
        } else {
          console.log('✓ Validation passed');
        }
      }
      
      // Step 6: Save test file
      const testFileName = `temp.test.${Date.now()}.js`;
      const testFilePath = path.join(path.dirname(sourceFilePath), testFileName);
      
      console.log(`\n Saving test file: ${testFileName}`);
      fs.writeFileSync(testFilePath, generatedContent);
      console.log('✓ Test file saved successfully');
      
      result.success = true;
      result.finalContent = generatedContent;
      result.testFilePath = testFilePath;
      
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      result.errors.push(error.message);
    }
    
    return result;
  }

  /**
   * Quick fix for existing test file
   */
  async fixExistingTestFile(sourceFilePath, testFilePath) {
    console.log('🔧 Fixing existing test file...');
    
    try {
      const testContent = fs.readFileSync(testFilePath, 'utf-8');
      const fixer = new TestFileFixer(sourceFilePath, testContent);
      const result = await fixer.fix();
      
      if (result.success) {
        // Save fixed version
        const fixedPath = testFilePath.replace('.js', '.fixed.js');
        fs.writeFileSync(fixedPath, result.content);
        console.log(`✓ Fixed test saved to: ${fixedPath}`);
        return { success: true, fixedPath, content: result.content };
      } else {
        console.log(`✗ Fix failed: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = TestGenerationOrchestrator;

// Example usage
if (require.main === module) {
  const orchestrator = new TestGenerationOrchestrator({
    autoFix: true,
    validateBeforeSave: true,
    maxRetries: 3
  });
  
  // Example: Fix existing test file
  if (process.argv[2] === 'fix') {
    const sourceFile = process.argv[3];
    const testFile = process.argv[4];
    
    if (!sourceFile || !testFile) {
      console.log('Usage: node test-generation-orchestrator.js fix <source-file> <test-file>');
      process.exit(1);
    }
    
    orchestrator.fixExistingTestFile(sourceFile, testFile).then(result => {
      if (result.success) {
        console.log('\n' + '='.repeat(80));
        console.log('FIXED CONTENT:');
        console.log('='.repeat(80));
        console.log(result.content);
      }
    });
  }
}
