# Quick Start Guide - AI Test Case Generator

## 🚀 How to Run and Test the Extension

### 1. Prerequisites
- VS Code installed
- Node.js installed
- API key from either:
  - Anthropic Claude: https://console.anthropic.com
  - Google Gemini: https://ai.google.dev

### 2. Running the Extension in Debug Mode

**Option A: Using F5 (Recommended)**
1. Open the project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open (Extension Development Host)

**Option B: Using Debug Panel**
1. Click the Run and Debug icon in the sidebar (Ctrl+Shift+D)
2. Select "Run Extension" from the dropdown
3. Click the green play button

### 3. First Time Setup - Configure API Key

In the Extension Development Host window:
1. Press `Ctrl+Shift+P` to open Command Palette
2. Type: `Test Generator: Configure API Key`
3. Select your AI provider (Gemini or Claude)
4. Enter your API key (stored securely)

### 4. Generate Test Cases

#### Method 1: Generate for Entire File
1. Open the `example.js` file (or any code file)
2. Press `Ctrl+Shift+P`
3. Type: `Test Generator: Generate Test Cases`
4. Wait 5-15 seconds for AI to generate tests
5. View results in the new panel on the right

#### Method 2: Generate for Selected Code
1. Open a code file
2. Select specific function(s) you want to test
3. Right-click and select "Test Generator: Generate from Selection"
4. View generated tests

#### Method 3: Context Menu
1. Right-click in any code file
2. Select "Test Generator: Generate Test Cases"

### 5. Using the Generated Tests

Once tests are generated, you can:
- **Copy All** - Click "📋 Copy All Tests" button
- **Copy Individual** - Click "Copy" on any specific test
- **Save to File** - Click "💾 Save to File" and choose location
- **Run Tests** - Click "▶️ Run Tests" (if npm test is configured)

## 📝 Testing with Example File

1. The project includes `example.js` with sample functions
2. Open it and run the extension
3. You should see tests generated for:
   - ✅ Normal cases (basic functionality)
   - ⚠️ Edge cases (empty arrays, null values)
   - ❌ Error cases (division by zero, invalid inputs)

## 🔧 Configuration Settings

Access via: `File > Preferences > Settings > Extensions > Test Case Generator`

- **API Provider**: `gemini` or `anthropic`
- **Model**: Leave empty for default
- **Max Tokens**: 4096 (default)
- **Temperature**: 0.7 (default)

## 🐛 Troubleshooting

### "No active editor" error
- Make sure a file is open before running the command

### "API key is required" error
- Run `Test Generator: Configure API Key` command first

### "Invalid API key" error
- Check your API key is correct
- For Claude: should start with `sk-ant-`
- For Gemini: should be from ai.google.dev

### "Network error"
- Check internet connection
- Verify firewall settings

### Tests not generating
- Ensure file has actual code (not empty)
- Try with smaller code sections
- Check the language is supported

## 📊 Expected Results

For the `example.js` file, you should see tests like:

```javascript
const { add, divide, findMax, isValidEmail } = require('./example');

describe('Math Functions', () => {
    test('add should sum two positive numbers', () => {
        expect(add(2, 3)).toBe(5);
    });
    
    test('divide should handle division by zero', () => {
        expect(() => divide(10, 0)).toThrow('Division by zero');
    });
    
    test('findMax should handle empty array', () => {
        expect(findMax([])).toBeNull();
    });
    
    // ... more tests
});
```

## 🎯 Test Coverage

The AI generates:
- ✅ **Normal Tests**: Basic functionality
- ⚠️ **Edge Cases**: Boundaries, empty inputs, null values
- ❌ **Error Tests**: Exceptions, invalid inputs

## 🔄 Regenerating Tests

If you're not satisfied with the results:
1. Run the command again (each generation is unique)
2. Adjust the temperature setting (higher = more creative)
3. Try selecting specific code sections
4. Add more descriptive comments to your code

## 📦 Project Structure

```
testcase/
├── src/
│   ├── extension.ts         ✅ Main entry point
│   ├── types.ts             ✅ Type definitions
│   ├── config.ts            ✅ Configuration management
│   ├── languageDetector.ts  ✅ Language detection
│   ├── testCaseGenerator.ts ✅ AI integration
│   └── webviewProvider.ts   ✅ UI panel
├── media/
│   ├── styles.css           ✅ WebView styling
│   └── script.js            ✅ WebView JavaScript
├── dist/
│   └── extension.js         ✅ Compiled code
├── example.js               ✅ Test file
└── package.json             ✅ Extension manifest
```

## 🎓 Advanced Usage

### Custom Test Frameworks
The extension auto-detects your project's testing framework from:
- `package.json` (for JS/TS)
- `requirements.txt` (for Python)
- Project files

### Multiple Files
You can:
1. Generate tests for multiple files by opening each
2. Save tests with appropriate naming convention
3. Organize tests in a `/tests` or `/__tests__` folder

### Integration with CI/CD
1. Generate tests during development
2. Review and adjust as needed
3. Add to your test suite
4. Run in CI pipeline

## 📈 Performance Tips

- Smaller code = faster generation
- Well-commented code = better test names
- Clear function names = more descriptive tests
- Use selection mode for large files

## 🎉 You're Ready!

Press F5 and start generating tests!

For issues or questions:
- Check the Debug Console in VS Code
- Review error messages carefully
- Consult the README.md

Happy testing! 🚀
