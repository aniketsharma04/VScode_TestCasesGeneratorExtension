# Testing Guide - Multi-Language Support

## ✅ Currently Supported Languages

### 1. **JavaScript** (Fully Working ✓)
- **Framework**: Jest
- **Example File**: `example.js`
- **Test Command**: `npx jest --config=jest.config.js`
- **Status**: ✅ Tested and Working

### 2. **Python** (Ready to Test)
- **Framework**: Pytest
- **Example File**: `example.py`
- **Test Command**: `pytest ./test_temp_*.py -v`
- **Installation**: `pip install pytest` ✅ Done
- **Status**: Ready for testing

### 3. **Java** (Setup Complete)
- **Framework**: JUnit 5 (Jupiter)
- **Build Tool**: Maven
- **Example File**: `src/main/java/com/testcase/Calculator.java`
- **Test Command**: `mvn test -Dtest=CalculatorTest`
- **Requirements**: JDK 11+, Maven (See [JAVA_SETUP.md](JAVA_SETUP.md))
- **Status**: Configuration complete, needs JDK/Maven installation

---

## 🧪 How to Test Each Language

### JavaScript Testing (Already Works)
1. Open `example.js`
2. Right-click → "Test Generator: Generate Test Cases"
3. Wait for AI generation
4. Click **"Run Tests"** button
5. Choose **"Terminal"** or **"Output Panel"**
6. ✅ Tests execute with Jest

### Python Testing
1. Open `example.py`
2. Right-click → "Test Generator: Generate Test Cases"
3. AI generates:
   ```python
   from example import add, divide, find_max
   import pytest
   
   class TestCalculator:
       def test_add_positive_numbers(self):
           assert add(2, 3) == 5
   ```
4. Click **"Run Tests"**
5. Choose **"Terminal"**
6. Pytest executes: `pytest test_temp_*.py -v`

### Java Testing (After Setup)
1. Install JDK 11+ and Maven (See [JAVA_SETUP.md](JAVA_SETUP.md))
2. Run: `mvn clean install` (first time only)
3. Open `src/main/java/com/testcase/Calculator.java`
4. Right-click → "Test Generator: Generate Test Cases"
5. AI generates JUnit 5 test with `@Test` annotations
6. Click **"Run Tests"**
7. Maven executes: `mvn test`

---

## 🔧 What Was Done for Multi-Language Support

### 1. Language-Specific AI Prompts
- **JavaScript/TypeScript**: Jest/Mocha syntax with `describe()` blocks
- **Python**: Pytest syntax with test classes and `assert` statements
- **Java**: JUnit 5 syntax with `@Test` annotations and assertions

### 2. Module Path Auto-Fixing
- **JavaScript**: `require('./yourFile')` → `require('./example')`
- **Python**: `from yourFile import` → `from example import`
- **Java**: `import YourClass` → `import Calculator`

### 3. Import Deduplication
- Removes duplicate imports for all languages
- Keeps first occurrence, discards repeats
- Language-aware detection (require, import, from)

### 4. Configuration Files
- ✅ `jest.config.js` - JavaScript/TypeScript
- ✅ `pytest.ini` - Python
- ✅ `pom.xml` - Java with JUnit 5 dependencies

### 5. Test Commands
- JavaScript: `npx jest --config=jest.config.js --rootDir=.`
- Python: `pytest ./test_temp_*.py -v`
- Java: `mvn test -Dtest=ClassName`

---

## 📁 Project Structure

```
testcase/
├── example.js                  # JavaScript example ✅
├── example.py                  # Python example ✅
├── jest.config.js             # Jest configuration ✅
├── pytest.ini                 # Pytest configuration ✅
├── pom.xml                    # Maven configuration ✅
├── src/
│   ├── main/java/com/testcase/
│   │   └── Calculator.java    # Java example ✅
│   └── test/java/com/testcase/
│       └── (generated tests)
└── JAVA_SETUP.md              # Java setup instructions ✅
```

---

## 🎯 Next Steps

1. **Test Python** - Open `example.py` and generate tests
2. **Install Java** - Follow [JAVA_SETUP.md](JAVA_SETUP.md) for JDK/Maven
3. **Test Java** - Generate tests for `Calculator.java`
4. **Report Issues** - Note any errors for fixing

---

## 🐛 Known Limitations

- **Java**: Requires JDK and Maven installation (not included)
- **Python**: Module imports must be in same directory (no packages yet)
- **Other Languages**: C++, Go, Rust, C# have commands but not fully tested
