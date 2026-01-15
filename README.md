# AI Test Case Generator

Automatically generate comprehensive test cases for your code using AI (Anthropic Claude or Google Gemini).

## Features

✨ **Automatic Test Generation**: Generate complete, runnable test cases with one command  
🎯 **Multi-Language Support**: JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, Ruby, PHP  
🧪 **Comprehensive Coverage**: Normal cases, edge cases, and error handling tests  
📋 **Easy Copy**: Copy all tests or individual test cases with one click  
💾 **Save to File**: Save generated tests directly to a file  
🎨 **Beautiful UI**: Modern, VS Code-themed interface  
⚡ **AI-Powered**: Uses Claude Sonnet 4 or Gemini 1.5 Flash for intelligent test generation

## Installation

1. Install the extension from VS Code Marketplace (or install from VSIX)
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Test Generator: Configure API Key" and select the command
5. Choose your AI provider (Anthropic Claude or Google Gemini)
6. Enter your API key

## Usage

### Generate Test Cases for Entire File

1. Open a code file
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Test Generator: Generate Test Cases" and press Enter
4. Wait for the AI to generate tests (5-15 seconds)
5. View the generated tests in a new panel
6. Copy individual tests or save all to a file

### Generate Test Cases for Selected Code

1. Open a code file
2. Select the code you want to test
3. Press `Ctrl+Shift+P`
4. Type "Test Generator: Generate from Selection" and press Enter
5. View the generated tests

### Configure API Key

1. Press `Ctrl+Shift+P`
2. Type "Test Generator: Configure API Key"
3. Select your AI provider:
   - **Anthropic Claude** - Most accurate, requires API key from console.anthropic.com
   - **Google Gemini** - Fast and free tier available, requires API key from ai.google.dev
4. Enter your API key (stored securely in VS Code secrets)

## Getting API Keys

### Anthropic Claude (Recommended)

1. Visit [https://console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy and paste into the extension
6. **Note**: Claude API requires payment but provides excellent results

### Google Gemini (Free Tier Available)

1. Visit [https://ai.google.dev](https://ai.google.dev)
2. Click "Get API key in Google AI Studio"
3. Sign in with your Google account
4. Create an API key
5. Copy and paste into the extension
6. **Note**: Free tier includes 15 requests per minute

## Supported Languages

- ✅ **JavaScript** - Jest, Mocha, Jasmine
- ✅ **TypeScript** - Jest, Mocha, Vitest
- ✅ **Python** - pytest, unittest
- ✅ **Java** - JUnit, TestNG
- ✅ **Go** - testing package
- ✅ **Rust** - cargo test
- ✅ **C++** - Google Test, Catch2
- ✅ **C#** - NUnit, xUnit
- ✅ **Ruby** - RSpec, Minitest
- ✅ **PHP** - PHPUnit

## Configuration

Access settings via: `File > Preferences > Settings > Extensions > Test Case Generator`

Available settings:
- **API Provider**: Choose between `anthropic` or `gemini` (default: gemini)
- **Model**: Specify which model to use
  - Anthropic: `claude-sonnet-4-20250514` (default)
  - Gemini: `gemini-2.5-flash` (default), also available: `gemini-2.0-flash`
- **Max Tokens**: Maximum response length (default: 4096)
- **Temperature**: AI creativity level 0-1 (default: 0.7)

## Commands

| Command | Description | Keyboard Shortcut |
|---------|-------------|-------------------|
| `Test Generator: Generate Test Cases` | Generate tests for current file | - |
| `Test Generator: Generate from Selection` | Generate tests for selected code | - |
| `Test Generator: Configure API Key` | Set up or update API key | - |

## Example

**Input Code (JavaScript):**
```javascript
function add(a, b) {
    return a + b;
}

function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}
```

**Generated Tests:**
```javascript
const { add, divide } = require('./math');

describe('Math Functions', () => {
    describe('add', () => {
        test('should add two positive numbers', () => {
            expect(add(2, 3)).toBe(5);
        });

        test('should handle negative numbers', () => {
            expect(add(-1, -1)).toBe(-2);
        });

        test('should handle zero', () => {
            expect(add(0, 5)).toBe(5);
        });
    });

    describe('divide', () => {
        test('should divide two numbers', () => {
            expect(divide(10, 2)).toBe(5);
        });

        test('should throw error on division by zero', () => {
            expect(() => divide(10, 0)).toThrow('Division by zero');
        });

        test('should handle negative divisor', () => {
            expect(divide(10, -2)).toBe(-5);
        });
    });
});
```

## Requirements

- VS Code 1.85.0 or higher
- Active internet connection
- Valid API key for Anthropic Claude or Google Gemini

## Known Issues

- Very large files (>5000 lines) may take longer to process
- Some complex code patterns might require manual adjustment of generated tests
- AI responses may vary - regenerate if needed

## Troubleshooting

### "Invalid API key" error
- Check that your API key is correct
- For Anthropic: Key should start with `sk-ant-`
- Reconfigure using `Test Generator: Configure API Key` command

### "Network error"
- Check your internet connection
- Verify firewall/proxy settings
- Try again in a few moments

### "Rate limit exceeded"
- You've hit the API rate limit
- Wait a few minutes and try again
- Consider upgrading your API plan

### Tests not generating properly
- Ensure your code is valid and parseable
- Try selecting a smaller section of code
- Check that the language is correctly detected

## Release Notes

### 0.0.1 (Initial Release)

- ✅ Automatic test case generation
- ✅ Support for 10 programming languages
- ✅ Multiple AI provider support (Claude & Gemini)
- ✅ Beautiful WebView UI with syntax highlighting
- ✅ Copy and save functionality
- ✅ Individual test case extraction
- ✅ Edge case and error handling tests
- ✅ Secure API key storage

## Contributing

Found a bug or have a feature request? Please open an issue on our [GitHub repository](https://github.com/yourusername/ai-testcase-generator).

## License

MIT License - See LICENSE file for details

## Privacy & Security

- 🔒 API keys are stored securely in VS Code's secret storage
- 🌐 Code is sent to your chosen AI provider for analysis
- 🚫 No data is stored or transmitted elsewhere
- ✅ All processing happens on AI provider's secure servers

## Tips

- 💡 Start with small, focused functions for best results
- 💡 Review and adjust generated tests as needed
- 💡 Use descriptive function/variable names for better test names
- 💡 Combine generated tests with manual tests for complete coverage
- 💡 Regenerate if first attempt isn't perfect

---

**Enjoy generating test cases!** 🚀

Made with ❤️ for developers who value quality code


---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
