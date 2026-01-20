# Java Setup Guide

## Prerequisites for Java Testing

To use Java testing features with this extension, you need:

### 1. Java Development Kit (JDK)

**Download and Install JDK 11 or Higher:**
- **Recommended**: [Eclipse Temurin (OpenJDK)](https://adoptium.net/)
- Alternative: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)

**Installation Steps:**
1. Download the installer for Windows x64
2. Run the installer
3. ✅ Check "Set JAVA_HOME variable"
4. ✅ Check "Add to PATH"
5. Click Install

**Verify Installation:**
```bash
java -version
javac -version
```

### 2. Apache Maven

**Download and Install Maven:**
- Download: [Apache Maven](https://maven.apache.org/download.cgi)
- Get the **Binary zip archive** (apache-maven-3.9.x-bin.zip)

**Installation Steps:**
1. Extract to: `C:\Program Files\Apache\maven`
2. Add to System PATH:
   - Search Windows: "Environment Variables"
   - Click "Environment Variables"
   - Under "System variables", select "Path"
   - Click "Edit" → "New"
   - Add: `C:\Program Files\Apache\maven\bin`
   - Click OK

**Verify Installation:**
```bash
mvn -version
```

### 3. Restart Required

After installation:
1. Close all terminals
2. Close VS Code completely
3. Reopen VS Code
4. Open a new terminal to verify

## Project Structure

```
src/
├── main/
│   └── java/
│       └── com/
│           └── testcase/
│               └── Calculator.java  (your source code)
└── test/
    └── java/
        └── com/
            └── testcase/
                └── CalculatorTest.java  (generated tests)
```

## Usage

1. **Setup Dependencies:**
   ```bash
   mvn clean install
   ```

2. **Open Java File:**
   - Navigate to your Java source file
   - Right-click → "Test Generator: Generate Test Cases"

3. **Run Tests:**
   - Click "Run Tests" button
   - Tests execute with: `mvn test`

## Maven Configuration

The `pom.xml` includes:
- **JUnit 5** (Jupiter) - Modern testing framework
- **Maven Surefire Plugin** - Test execution
- **Maven Compiler Plugin** - Java compiler

## Troubleshooting

**"java is not recognized"**
- Ensure JDK bin directory is in PATH
- Restart terminal/VS Code after installation
- Check: `echo %JAVA_HOME%`

**"mvn is not recognized"**
- Ensure Maven bin directory is in PATH
- Restart terminal/VS Code
- Check: `echo %PATH%` includes Maven

**Tests don't run**
- Run `mvn clean compile` first
- Check package declaration matches folder structure
- Verify JUnit dependencies in `pom.xml`

## Example Test

```java
package com.testcase;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorTest {
    @Test
    public void testAdd() {
        assertEquals(5, Calculator.add(2, 3));
    }
    
    @Test
    public void testDivideByZero() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.divide(5, 0);
        });
    }
}
```
