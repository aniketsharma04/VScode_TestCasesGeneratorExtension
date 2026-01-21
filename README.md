# AI Test Case Generator

> 🤖 Automatically generate comprehensive, production-ready test cases for your code using AI (Anthropic Claude or Google Gemini)

[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 📑 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture Overview](#-architecture-overview)
- [Project Structure](#-project-structure)
- [Core Components](#-core-components)
- [Technical Implementation](#-technical-implementation)
- [Configuration](#-configuration)
- [Development Guide](#-development-guide)
- [API Integration](#-api-integration)
- [Usage Examples](#-usage-examples)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### Core Capabilities
- ✨ **Automatic Test Generation**: Generate exactly 12 comprehensive test cases with one command
- 🎯 **Multi-Language Support**: JavaScript, TypeScript, Python, Java (with more coming soon)
- 🧪 **Comprehensive Coverage**: Normal cases, edge cases, and error handling tests
- ➕ **Generate More Tests**: Click to generate 12 additional tests with intelligent diversity (24, 36, 48...)
- 🎯 **Smart Generation**: Ensures unique and diverse test coverage with automatic optimization
- ▶️ **Run Tests Directly**: Execute generated tests in terminal or output panel
- 🔧 **Auto Framework Detection**: Detects and installs Jest, Pytest, JUnit automatically
- 📋 **Easy Copy**: Copy all tests or individual test cases with one click
- 💾 **Save to File**: Save generated tests directly to a file
- 🎨 **Beautiful UI**: Modern, VS Code-themed interface with statistics
- ⚡ **AI-Powered**: Uses Claude Sonnet 4 or Gemini 2.5 Flash for intelligent test generation

### Technical Features
- 🔒 **Secure Storage**: API keys encrypted in VS Code Secrets
- 🌳 **AST Parsing**: Uses Babel parser for JavaScript/TypeScript code analysis
- 🎯 **Smart Detection**: Automatic language and framework detection
- 🔄 **Module Path Auto-Fixing**: Automatically corrects import paths in generated tests
- 📊 **Test Categorization**: Automatically categorizes tests (normal/edge/error)
- 🔄 **Real-time Processing**: Progress indicators and streaming responses
- 🎨 **Custom WebView**: Rich UI with syntax highlighting and interactive controls
- 🚀 **Framework Auto-Installation**: Prompts to install missing test frameworks
- 🎲 **Consistent Batches**: Always generates exactly 12 tests per request for systematic coverage
- 🧹 **Intelligent Optimization**: Multi-attempt generation with automatic quality assurance
- 📈 **Clean Interface**: Simple, clutter-free statistics display

---

## 🌍 Supported Languages

| Language | Status | Framework | Run Tests |
|----------|--------|-----------|-----------|
| **JavaScript** | ✅ Fully Working | Jest, Mocha, Jasmine | ✅ Supported |
| **TypeScript** | ✅ Fully Working | Jest, Mocha, Vitest | ✅ Supported |
| **Python** | ✅ Fully Working | Pytest, unittest | ✅ Supported |
| **Java** | 🔧 Setup Required | JUnit 5, TestNG | ✅ Supported* |
| Go | 📝 Planned | testing | 🔜 Coming Soon |
| Rust | 📝 Planned | cargo test | 🔜 Coming Soon |
| C++ | 📝 Planned | gtest, catch2 | 🔜 Coming Soon |
| C# | 📝 Planned | NUnit, XUnit | 🔜 Coming Soon |
| Ruby | 📝 Planned | RSpec, Minitest | 🔜 Coming Soon |
| PHP | 📝 Planned | PHPUnit | 🔜 Coming Soon |

\* Java requires JDK 11+ and Maven installation. See [javasetup.md](javasetup.md) for details.

### Language-Specific Features

#### JavaScript/TypeScript
- ✅ AST-based code analysis
- ✅ Automatic Jest/Mocha detection
- ✅ Module path auto-fixing (`require('./yourFile')` → `require('./example')`)
- ✅ Import deduplication
- ✅ Terminal and Output Panel execution

#### Python  
- ✅ Pytest-style test generation
- ✅ Automatic pytest detection (`python -m pytest`)
- ✅ Import path auto-fixing (`from yourFile import` → `from example import`)
- ✅ Test class organization
- ✅ Works without PATH configuration

#### Java
- ✅ JUnit 5 (Jupiter) support
- ✅ Maven project structure
- ✅ Class and method testing
- ✅ Exception testing with `assertThrows()`
- 🔧 Requires JDK and Maven installation

---

## 🚀 Quick Start

### Installation

1. **Install Extension**
   - From VS Code Marketplace (coming soon)
   - Or install from VSIX file

2. **Configure API Key**
   ```bash
   Ctrl+Shift+P → "Test Generator: Configure API Key"
   ```
   - Choose AI provider (Anthropic Claude or Google Gemini)
   - Enter your API key (stored securely)

3. **Generate Tests**
   ```bash
   Open any code file → Ctrl+Shift+P → "Test Generator: Generate Test Cases"
   ```

4. **Run Tests** (New!)
   ```bash
   Click "Run Tests" button in generated tests panel
   Choose: Terminal (real-time) or Output Panel (formatted)
   ```

### Prerequisites
- **VS Code**: Version 1.85.0 or higher
- **Node.js**: Version 18.x or higher
- **Internet Connection**: Required for AI API calls
- **API Key**: From [Anthropic](https://console.anthropic.com) or [Google AI](https://ai.google.dev)

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension Host                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐     ┌────────────┐ │
│  │  Extension   │──────│   Language   │─────│   Config   │ │
│  │  Controller  │      │   Detector   │     │  Manager   │ │
│  └──────────────┘      └──────────────┘     └────────────┘ │
│         │                      │                     │       │
│         │                      ▼                     │       │
│         │              ┌──────────────┐              │       │
│         └─────────────▶│ Test Case    │◀─────────────┘       │
│                        │  Generator   │                      │
│                        └──────────────┘                      │
│                               │                              │
│                               ▼                              │
│                    ┌────────────────────┐                    │
│                    │   AI Provider      │                    │
│                    │  (Claude/Gemini)   │                    │
│                    └────────────────────┘                    │
│                               │                              │
│                               ▼                              │
│                    ┌────────────────────┐                    │
│                    │  WebView Provider  │                    │
│                    └────────────────────┘                    │
│                               │                              │
└───────────────────────────────┼──────────────────────────────┘
                                ▼
                     ┌────────────────────┐
                     │   WebView Panel    │
                     │  (HTML/CSS/JS UI)  │
                     └────────────────────┘
```

### Component Interaction Flow

```
User Action → Extension Command → Language Detection → Code Validation 
    ↓
API Key Check → AI API Call (Claude/Gemini) → Response Parsing
    ↓
Test Categorization → WebView Rendering → User Interaction
```

### Data Flow

1. **Input**: User opens file and triggers command
2. **Processing**: Code analyzed, language detected, sent to AI
3. **Generation**: AI generates test cases based on optimized prompt
4. **Parsing**: Response parsed into structured test cases
5. **Display**: Tests rendered in WebView with interactive controls
6. **Output**: User copies/saves tests to files

---

## 📂 Project Structure

### Directory Layout

```
testcase/
├── src/                          # Source code
│   ├── extension.ts              # Extension entry point & activation
│   ├── testCaseGenerator.ts     # AI integration & test generation
│   ├── languageDetector.ts      # Code parsing & language detection
│   ├── webviewProvider.ts       # WebView panel management
│   ├── sidebarProvider.ts       # Activity bar sidebar view
│   ├── config.ts                # Configuration & API key management
│   ├── types.ts                 # TypeScript type definitions
│   └── test/                    # Test files
│       └── extension.test.ts    # Extension unit tests
├── media/                        # WebView assets
│   ├── script.js                # WebView client-side JavaScript
│   ├── styles.css               # WebView styling
│   └── icon.png                 # Extension icon
├── dist/                         # Compiled output (generated)
│   └── extension.js             # Bundled extension code
├── package.json                  # Extension manifest & dependencies
├── tsconfig.json                # TypeScript configuration
├── webpack.config.js            # Webpack bundler configuration
├── eslint.config.mjs            # ESLint configuration
├── example.js                   # Example code for testing
├── README.md                    # This documentation
├── QUICK_START.md              # Quick start guide
└── CHANGELOG.md                # Version history
```

### File Responsibilities

| File | Purpose | Key Functions |
|------|---------|---------------|
| **extension.ts** | Main entry point | `activate()`, `handleGenerateTests()`, `handleConfigureApiKey()` |
| **testCaseGenerator.ts** | AI integration | `generateTests()`, `generateWithClaude()`, `generateWithGemini()` |
| **languageDetector.ts** | Code analysis | `getLanguageFromDocument()`, `extractCodeBlocks()`, `validateCode()` |
| **webviewProvider.ts** | UI rendering | `createTestCasePanel()`, `getWebviewContent()`, `handleWebviewMessage()` |
| **sidebarProvider.ts** | Sidebar UI | `TestGeneratorViewProvider`, `registerSidebarView()` |
| **config.ts** | Configuration | `getConfig()`, `getApiKey()`, `storeApiKey()` |
| **types.ts** | Type definitions | Interfaces for `TestCase`, `GeneratedTests`, `ExtensionConfig` |

---

## 🔧 Core Components

### 1. Extension Controller (`extension.ts`)

**Purpose**: Main extension lifecycle management and command orchestration

**Key Responsibilities**:
- Extension activation and deactivation
- Command registration and handling
- Workflow coordination
- Progress notifications
- Error handling and user feedback

**Command Handlers**:
```typescript
// Generate tests for entire file
testcase-generator.generate

// Generate tests for selected code
testcase-generator.generateFromSelection

// Configure API key
testcase-generator.configure

// Refresh sidebar view
testcase-generator.refreshView
```

**Activation Flow**:
```typescript
activate() → Register commands → Register sidebar view 
  → Check first-time user → Show welcome message
```

### 2. Test Case Generator (`testCaseGenerator.ts`)

**Purpose**: Core AI integration and test generation logic

**Architecture**:
```typescript
generateTests()
  ├── Determine framework
  ├── Call AI provider
  │   ├── generateWithClaude() → Anthropic API
  │   └── generateWithGemini() → Google API
  ├── Parse response
  │   ├── Extract imports
  │   ├── Extract test cases
  │   └── Categorize tests
  └── Validate output
```

**AI Prompt Engineering**:
- Optimized prompt structure for test generation
- Specifies testing framework and conventions
- Requests normal, edge, and error cases
- Enforces code-only output format

**Test Parsing Logic**:
```typescript
parseTestCases()
  ├── Remove markdown code blocks
  ├── Extract imports (framework-specific)
  ├── Parse individual test functions
  │   ├── extractJestTests() → Jest/Mocha patterns
  │   ├── extractPytestTests() → Python test patterns
  │   └── extractJUnitTests() → Java test patterns
  └── Categorize by test type (normal/edge/error)
```

### 3. Language Detector (`languageDetector.ts`)

**Purpose**: Language detection and code structure analysis

**Features**:
- Automatic language detection from VS Code document
- Manual language selection fallback
- AST-based code parsing (JavaScript/TypeScript)
- Regex-based parsing (Python, others)
- Code validation before generation

**JavaScript/TypeScript Parsing**:
```typescript
Uses Babel Parser with plugins:
  - typescript
  - jsx
  - decorators-legacy

Extracts:
  - FunctionDeclaration
  - ClassMethod
  - ArrowFunctionExpression
```

**Code Block Structure**:
```typescript
interface CodeBlock {
  type: 'function' | 'class' | 'method'
  name: string
  code: string
  startLine: number
  endLine: number
  params?: string[]
  returnType?: string
}
```

### 4. WebView Provider (`webviewProvider.ts`)

**Purpose**: Render generated tests in interactive UI panel

**Architecture**:
```typescript
createTestCasePanel()
  ├── Create WebView panel
  ├── Generate HTML content
  │   ├── Header with stats
  │   ├── Action buttons
  │   └── Test case cards
  ├── Setup message handlers
  │   ├── copy → Clipboard feedback
  │   ├── saveFile → File picker
  │   └── runTests → Terminal execution
  └── Return panel instance
```

**Message Protocol**:
```typescript
Extension → WebView:
  - Initial data via window.testData

WebView → Extension:
  - { command: 'copy', success: true }
  - { command: 'saveFile', content: string, language: string }
  - { command: 'runTests', content: string }
  - { command: 'error', text: string }
```

**UI Features**:
- Syntax-highlighted code blocks
- Test categorization badges (normal/edge/error)
- Copy buttons for individual tests and all tests
- Save to file with auto-extension detection
- Human-readable test explanations
- Responsive design

### 5. Configuration Manager (`config.ts`)

**Purpose**: Manage extension settings and API keys

**Configuration Schema**:
```typescript
interface ExtensionConfig {
  apiProvider: 'anthropic' | 'gemini'
  apiKey: string              // From secure storage
  model: string               // Default or custom model
  maxTokens: number           // 512-8192
  temperature: number         // 0-1
}
```

**API Key Security**:
- Stored in VS Code Secrets API (encrypted)
- Never exposed in settings or logs
- Validated before API calls
- Provider-specific format validation

**Framework Detection**:
```typescript
JavaScript/TypeScript: Check package.json dependencies
Python: Check requirements.txt or Pipfile
Java: Check pom.xml or build.gradle
```

---

## 💻 Technical Implementation

### Extension Activation

**When**: VS Code starts or extension is first used

**Process**:
```typescript
1. activate(context) called by VS Code
2. Register all commands (generate, configure, etc.)
3. Register sidebar TreeView provider
4. Check if first-time user
5. Show welcome message if needed
6. Extension ready to receive commands
```

**Deactivation**:
```typescript
deactivate() → Cleanup resources → Log shutdown
```

### Test Generation Workflow

**Step-by-Step Process**:

```typescript
1. User Trigger
   - Command palette: "Test Generator: Generate Test Cases"
   - Context menu: Right-click → Generate
   - Sidebar button click

2. Input Validation
   - Check active editor exists
   - Verify code is not empty
   - Detect/select language
   - Validate code syntax

3. Configuration
   - Read VS Code settings
   - Check for API key in secure storage
   - Prompt for API key if missing
   - Validate API key format

4. AI API Call
   - Build optimized prompt with code and requirements
   - Call Anthropic Claude or Google Gemini API
   - Stream or wait for complete response
   - Handle network errors and rate limits

5. Response Processing
   - Remove markdown formatting
   - Extract imports section
   - Parse individual test cases
   - Categorize tests (normal/edge/error)
   - Validate generated code structure

6. UI Rendering
   - Create WebView panel
   - Inject generated HTML with tests
   - Setup message handlers
   - Enable copy/save/run actions

7. User Interaction
   - Copy individual or all tests
   - Save to file with correct extension
   - Run tests in terminal (if configured)
```

### Code Parsing Strategy

**JavaScript/TypeScript (AST-based)**:
```typescript
Source Code → Babel Parser → AST
  ↓
Traverse AST nodes
  ├── FunctionDeclaration nodes
  ├── ClassMethod nodes
  └── ArrowFunctionExpression nodes
  ↓
Extract function details
  ├── Name, parameters
  ├── Start/end line numbers
  └── Code snippet
```

**Python (Regex-based)**:
```typescript
Source Code → Line-by-line scan
  ↓
Match regex: /def\s+(\w+)\s*\(/
  ↓
Find function end (by indentation)
  ↓
Extract function block
```

### Test Categorization Algorithm

```typescript
function determineTestType(testName: string): TestType {
  const lower = testName.toLowerCase()
  
  // Error handling tests
  if (lower.includes('error') || 
      lower.includes('throw') || 
      lower.includes('invalid'))
    return 'error'
  
  // Edge case tests
  if (lower.includes('edge') || 
      lower.includes('empty') || 
      lower.includes('null'))
    return 'edge'
  
  // Normal tests
  return 'normal'
}
```

### Security Implementation

**API Key Storage**:
```typescript
// Store (encrypted)
await context.secrets.store('anthropic-api-key', apiKey)

// Retrieve
const key = await context.secrets.get('anthropic-api-key')

// Validation
if (provider === 'anthropic' && !key.startsWith('sk-ant-'))
  throw new Error('Invalid Anthropic API key format')
```

**Content Security Policy**:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'none'; 
               style-src ${webview.cspSource} 'unsafe-inline'; 
               script-src 'nonce-${nonce}';">
```

---

## ⚙️ Configuration

### VS Code Settings

Access via: `File → Preferences → Settings → Extensions → Test Case Generator`

```json
{
  "testCaseGenerator.apiProvider": {
    "type": "string",
    "default": "gemini",
    "enum": ["anthropic", "gemini"],
    "description": "AI provider to use for test generation"
  },
  "testCaseGenerator.model": {
    "type": "string",
    "default": "",
    "description": "Model to use (leave empty for default)"
  },
  "testCaseGenerator.maxTokens": {
    "type": "number",
    "default": 4096,
    "minimum": 512,
    "maximum": 8192,
    "description": "Maximum tokens in AI response"
  },
  "testCaseGenerator.temperature": {
    "type": "number",
    "default": 0.7,
    "minimum": 0,
    "maximum": 1,
    "description": "AI creativity level (0=focused, 1=creative)"
  }
}
```

### Default Models

| Provider | Default Model | Alternative Models |
|----------|---------------|-------------------|
| **Anthropic** | `claude-sonnet-4-20250514` | `claude-opus-4-20250514` |
| **Google** | `gemini-2.5-flash` | `gemini-2.0-flash`, `gemini-1.5-pro` |

### Framework Support Matrix

| Language | Default Framework | Supported Frameworks |
|----------|------------------|---------------------|
| JavaScript | Jest | Jest, Mocha, Jasmine |
| TypeScript | Jest | Jest, Mocha, Vitest |
| Python | pytest | pytest, unittest |
| Java | JUnit | JUnit, TestNG |
| Go | testing | testing (built-in) |
| Rust | cargo test | cargo test |
| C++ | Google Test | GTest, Catch2 |
| C# | NUnit | NUnit, xUnit |
| Ruby | RSpec | RSpec, Minitest |
| PHP | PHPUnit | PHPUnit |

---

## 👨‍💻 Development Guide

### Setup Development Environment

**1. Clone and Install**
```bash
git clone <repository-url>
cd testcase
npm install
```

**2. Build the Extension**
```bash
# One-time build
npm run compile

# Watch mode (auto-rebuild on changes)
npm run watch
```

**3. Run in Debug Mode**
- Press `F5` in VS Code
- Or use Debug panel: "Run Extension"
- Extension Development Host window opens

**4. Test the Extension**
- Open `example.js` in the development window
- Press `Ctrl+Shift+P`
- Run "Test Generator: Configure API Key"
- Then "Test Generator: Generate Test Cases"

### Build Scripts

```json
{
  "compile": "webpack",                    // Build once
  "watch": "webpack --watch",              // Auto-rebuild
  "package": "webpack --mode production",  // Production build
  "lint": "eslint src",                    // Run linter
  "test": "vscode-test"                    // Run tests
}
```

### Debugging

**Extension Code**:
- Set breakpoints in TypeScript files
- Press `F5` to start debugging
- Extension runs in new VS Code window

**WebView Code**:
- Open Developer Tools in Extension Host
- `Help → Toggle Developer Tools`
- Debug `media/script.js` in console

### Adding New Language Support

**1. Update Types** (`types.ts`):
```typescript
export type SupportedLanguage = 
  | 'javascript' 
  | 'python'
  | 'yournewlanguage'  // Add here
```

**2. Update Language Map** (`languageDetector.ts`):
```typescript
const LANGUAGE_MAP = {
  'yournewlanguage': 'yournewlanguage',
  // ...
}
```

**3. Update Framework Map** (`config.ts`):
```typescript
const FRAMEWORK_MAP = {
  'yournewlanguage': ['framework1', 'framework2'],
  // ...
}
```

**4. Add Parsing Logic** (`languageDetector.ts`):
```typescript
if (language === 'yournewlanguage') {
  return extractYourLanguageBlocks(code)
}
```

### Extension Packaging

**Build VSIX Package**:
```bash
npm install -g vsce
npm run package
vsce package
```

**Install Locally**:
```bash
code --install-extension testcase-generator-0.0.1.vsix
```

---

## 🔌 API Integration

### Anthropic Claude Integration

**SDK**: `@anthropic-ai/sdk` v0.32.1

**Implementation**:
```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: config.apiKey })

const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  temperature: 0.7,
  messages: [{
    role: 'user',
    content: prompt
  }]
})
```

**Response Structure**:
```typescript
{
  id: 'msg_...',
  type: 'message',
  role: 'assistant',
  content: [{
    type: 'text',
    text: '... generated test code ...'
  }],
  model: 'claude-sonnet-4-20250514',
  stop_reason: 'end_turn'
}
```

**Error Handling**:
- `401`: Invalid API key
- `429`: Rate limit exceeded
- `500`: API server error

### Google Gemini Integration

**SDK**: `@google/generative-ai` v0.21.0

**Implementation**:
```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(config.apiKey)
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 4096
  }
})

const result = await model.generateContent(prompt)
const response = await result.response
const text = response.text()
```

**Rate Limits**:
- Free tier: 15 requests/minute
- Paid tier: Higher limits based on plan

### Prompt Engineering

**Optimized Prompt Structure**:
```
Role: "You are an expert software testing engineer"

Input: Source code with language specification

Requirements:
  - Use specific testing framework
  - Generate normal, edge, and error cases
  - Clear, descriptive test names
  - Include setup, execution, assertions
  - Add comments explaining scenarios
  - Include imports and setup code
  - Make tests independent and runnable
  - Follow framework best practices

Output Format: "Provide ONLY complete, runnable test code"
```

---

## 📖 Usage Examples

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

---

## 📖 Usage Examples

### Example 1: JavaScript Function Testing

**Input Code** (`math.js`):
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

**Generated Tests** (Jest):
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

### Example 2: Python Function Testing

**Input Code** (`calculator.py`):
```python
def find_max(arr):
    """Find maximum value in array"""
    if not arr or len(arr) == 0:
        return None
    return max(arr)
```

**Generated Tests** (pytest):
```python
import pytest
from calculator import find_max

def test_find_max_with_positive_numbers():
    """Test finding max in positive numbers"""
    assert find_max([1, 5, 3, 9, 2]) == 9

def test_find_max_with_negative_numbers():
    """Test finding max in negative numbers"""
    assert find_max([-1, -5, -3]) == -1

def test_find_max_with_single_element():
    """Test finding max with one element"""
    assert find_max([42]) == 42

def test_find_max_with_empty_array():
    """Test finding max in empty array"""
    assert find_max([]) is None

def test_find_max_with_none():
    """Test finding max with None input"""
    assert find_max(None) is None
```

### Example 3: TypeScript Class Testing

**Input Code** (`user.ts`):
```typescript
class UserService {
    private users: Map<string, User> = new Map();

    addUser(user: User): void {
        if (!user.email || !user.name) {
            throw new Error('Invalid user data');
        }
        this.users.set(user.email, user);
    }

    getUser(email: string): User | undefined {
        return this.users.get(email);
    }
}
```

**Generated Tests** (Jest with TypeScript):
```typescript
import { UserService, User } from './user';

describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        service = new UserService();
    });

    describe('addUser', () => {
        test('should add valid user successfully', () => {
            const user: User = { email: 'test@example.com', name: 'John' };
            expect(() => service.addUser(user)).not.toThrow();
        });

        test('should throw error for user without email', () => {
            const user: User = { email: '', name: 'John' };
            expect(() => service.addUser(user))
                .toThrow('Invalid user data');
        });

        test('should throw error for user without name', () => {
            const user: User = { email: 'test@example.com', name: '' };
            expect(() => service.addUser(user))
                .toThrow('Invalid user data');
        });
    });

    describe('getUser', () => {
        test('should return user when exists', () => {
            const user: User = { email: 'test@example.com', name: 'John' };
            service.addUser(user);
            expect(service.getUser('test@example.com')).toEqual(user);
        });

        test('should return undefined for non-existent user', () => {
            expect(service.getUser('notfound@example.com')).toBeUndefined();
        });
    });
});
```

### Command Usage

**1. Generate from Context Menu**:
```
Right-click in editor → "Test Generator: Generate Test Cases"
```

**2. Generate for Selection**:
```
Select code → Right-click → "Test Generator: Generate from Selection"
```

**3. Using Command Palette**:
```
Ctrl+Shift+P → Type "test generator" → Select command
```

**4. Using Sidebar**:
```
Click Test Generator icon in Activity Bar → Click "Generate Test Cases"
```

---

## 🔍 Troubleshooting

### Common Issues and Solutions

#### **"No active editor" error**
- **Cause**: No file is currently open
- **Solution**: Open a code file before running the command

#### **"Invalid API key" error**
- **Cause**: API key format is incorrect or missing
- **Solution**: 
  - Run `Test Generator: Configure API Key`
  - For Anthropic: Key must start with `sk-ant-`
  - For Gemini: Verify key from ai.google.dev

#### **"Network error"**
- **Cause**: No internet connection or firewall blocking
- **Solution**:
  - Check internet connection
  - Verify firewall/proxy settings allow connections to:
    - `api.anthropic.com` (for Claude)
    - `generativelanguage.googleapis.com` (for Gemini)

#### **"API rate limit exceeded" (429)**
- **Cause**: Too many requests in short time
- **Solution**:
  - Wait 60 seconds and try again
  - For Gemini free tier: Limited to 15 requests/minute
  - Consider upgrading to paid tier

#### **Tests not generating properly**
- **Cause**: Code syntax errors or unsupported language
- **Solution**:
  - Ensure code is valid and parseable
  - Check language is in supported list
  - Try selecting smaller code sections
  - Regenerate if AI response is incomplete

#### **WebView not opening**
- **Cause**: Extension not fully activated
- **Solution**:
  - Reload VS Code window (`Ctrl+R`)
  - Reinstall extension
  - Check Developer Tools for errors

#### **"Failed to parse response"**
- **Cause**: AI returned unexpected format
- **Solution**:
  - Regenerate tests (AI responses can vary)
  - Try with smaller code snippet
  - Check if API model is supported

### Debug Mode

**Enable Extension Logging**:
1. Open Developer Tools: `Help → Toggle Developer Tools`
2. Check Console tab for extension logs
3. Look for errors starting with "AI Test Case Generator:"

**Common Log Messages**:
```
✅ "AI Test Case Generator extension is now active"
✅ "Analyzing code..."
✅ "Generated X test cases successfully"
❌ "Test generation error: ..."
❌ "API key validation failed"
```

### Performance Issues

**Large Files (>5000 lines)**:
- Select specific functions instead of entire file
- AI processing time increases with code size
- Consider breaking into smaller modules

**Slow Response Times**:
- Gemini is typically faster than Claude
- Network latency affects response time
- Larger `maxTokens` setting = slower generation

---

## 🤝 Contributing

### How to Contribute

We welcome contributions! Here's how to get started:

**1. Fork and Clone**
```bash
git clone https://github.com/yourusername/ai-testcase-generator.git
cd ai-testcase-generator
npm install
```

**2. Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

**3. Make Changes**
- Follow existing code style
- Add tests for new features
- Update documentation

**4. Test Your Changes**
```bash
npm run compile
npm run lint
npm test
```

**5. Submit Pull Request**
- Write clear commit messages
- Describe changes in PR description
- Link related issues

### Development Guidelines

**Code Style**:
- Use TypeScript strict mode
- Follow ESLint rules
- Use meaningful variable names
- Add JSDoc comments for public functions

**Commit Messages**:
```
feat: Add support for new language
fix: Resolve API key validation issue
docs: Update README with examples
refactor: Improve code parsing logic
test: Add unit tests for config manager
```

**Testing**:
- Write unit tests for new functions
- Test with multiple languages
- Verify WebView rendering
- Test error scenarios

### Reporting Issues

**Bug Reports** should include:
- VS Code version
- Extension version
- Steps to reproduce
- Expected vs actual behavior
- Error messages/screenshots
- Sample code (if applicable)

**Feature Requests** should include:
- Clear description of feature
- Use case/motivation
- Expected behavior
- Potential implementation approach

---

## 📚 Dependencies

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@anthropic-ai/sdk` | ^0.32.1 | Anthropic Claude API integration |
| `@google/generative-ai` | ^0.21.0 | Google Gemini API integration |
| `@babel/parser` | ^7.25.9 | JavaScript/TypeScript AST parsing |
| `@babel/traverse` | ^7.25.9 | AST traversal for code analysis |
| `@babel/types` | ^7.25.9 | Babel type definitions |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.3 | TypeScript compiler |
| `webpack` | ^5.104.1 | Module bundler |
| `ts-loader` | ^9.5.4 | TypeScript loader for Webpack |
| `eslint` | ^9.39.2 | Code linting |
| `typescript-eslint` | ^8.52.0 | TypeScript ESLint plugin |
| `@types/vscode` | ^1.85.0 | VS Code API type definitions |
| `@vscode/test-cli` | ^0.0.12 | VS Code test runner |

### VS Code API Requirements

**Minimum Version**: 1.85.0

**Used APIs**:
- `vscode.window.createWebviewPanel` - WebView panels
- `vscode.window.showInputBox` - User input dialogs
- `vscode.window.showQuickPick` - Selection dialogs
- `vscode.commands.registerCommand` - Command registration
- `vscode.workspace.getConfiguration` - Settings access
- `context.secrets.store/get` - Secure storage
- `vscode.window.createTreeView` - Sidebar view

---

## 📜 License

MIT License - See [LICENSE](LICENSE) file for details

---

## 🔒 Privacy & Security

### Data Handling

- **API Keys**: Encrypted and stored in VS Code Secrets (never exposed)
- **Source Code**: Sent only to your chosen AI provider (Anthropic/Google)
- **Generated Tests**: Stored locally, not transmitted elsewhere
- **No Telemetry**: No usage data collected or transmitted
- **No Third-Party Tracking**: No analytics or tracking scripts

### Security Measures

- ✅ Content Security Policy (CSP) for WebView
- ✅ API key validation before transmission
- ✅ Secure HTTPS connections to AI providers
- ✅ Input sanitization and validation
- ✅ XSS prevention in WebView rendering

### AI Provider Privacy

**Anthropic Claude**:
- Data sent: Source code, language, framework
- Privacy policy: https://www.anthropic.com/privacy
- Data retention: As per Anthropic's policy

**Google Gemini**:
- Data sent: Source code, language, framework  
- Privacy policy: https://ai.google.dev/terms
- Data retention: As per Google's policy

---

## 💡 Tips & Best Practices

### For Best Results

✨ **Code Quality**:
- Use descriptive function and variable names
- Add JSDoc/docstring comments
- Follow language conventions
- Keep functions focused and small

✨ **Test Generation**:
- Start with small, focused functions
- Review and adjust generated tests
- Combine AI tests with manual tests
- Regenerate if first attempt isn't perfect

✨ **API Usage**:
- Use Gemini for rapid iteration (free tier)
- Use Claude for production-quality tests
- Monitor rate limits on free tiers
- Consider paid tiers for heavy usage

### Workflow Recommendations

**1. Iterative Development**:
```
Write function → Generate tests → Review → Refine → Repeat
```

**2. Test Coverage**:
- Generate tests for public APIs first
- Add manual tests for complex edge cases
- Use AI for boilerplate test generation
- Human review for business logic tests

**3. Integration**:
- Save generated tests to project test directory
- Adjust imports and paths as needed
- Run tests to verify correctness
- Commit both code and tests together

---

## 📞 Support & Resources

### Documentation
- **Quick Start**: See [QUICK_START.md](QUICK_START.md)
- **Changelog**: See [CHANGELOG.md](CHANGELOG.md)
- **GitHub**: https://github.com/yourusername/ai-testcase-generator

### Get Help
- **Issues**: Report bugs or request features on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Email**: support@yourcompany.com (if applicable)

### AI Provider Resources
- **Anthropic Docs**: https://docs.anthropic.com
- **Gemini Docs**: https://ai.google.dev/docs
- **VS Code Extension API**: https://code.visualstudio.com/api

---

## 🎯 Roadmap

### Planned Features

- [ ] Support for more languages (Swift, Kotlin, Scala)
- [ ] Custom test template support
- [ ] Test coverage analysis integration
- [ ] Batch file processing
- [ ] CI/CD integration helpers
- [ ] Multi-file context awareness
- [ ] Custom prompt templates
- [ ] Test maintenance suggestions
- [ ] Integration with popular test runners

---

## 🏆 Credits

**Developed with ❤️ by the Navyug Team**

Special thanks to:
- Anthropic for Claude API
- Google for Gemini API
- VS Code Extension API team
- Open source contributors

---

## 📄 Version Information

**Current Version**: 0.0.1  
**Release Date**: January 2026  
**VS Code Compatibility**: 1.85.0+  
**Node.js Compatibility**: 18.x+

---

**Enjoy generating test cases!** 🚀

*Made with ❤️ for developers who value quality code*
