# Java Setup Guide for Test Case Generator

## Prerequisites

To use Java testing features, you need to install:

### 1. Java Development Kit (JDK)
Download and install JDK 11 or higher:
- **Oracle JDK**: https://www.oracle.com/java/technologies/downloads/
- **OpenJDK**: https://adoptium.net/

After installation, verify:
```bash
java -version
javac -version
```

### 2. Apache Maven
Download and install Maven:
- **Maven**: https://maven.apache.org/download.cgi

After installation, verify:
```bash
mvn -version
```

## Project Structure

The extension uses Maven standard directory layout:
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

## Testing Workflow

1. **Open Java file**: `src/main/java/com/testcase/Calculator.java`
2. **Generate tests**: Right-click → "Test Generator: Generate Test Cases"
3. **AI generates**: JUnit 5 tests with proper annotations
4. **Run tests**: Click "Run Tests" button → Choose "Terminal"
5. **Maven executes**: `mvn test -Dtest=CalculatorTest`

## Dependencies

The `pom.xml` file includes:
- JUnit 5 (Jupiter) - Modern testing framework
- Maven Surefire Plugin - Test runner
- Maven Compiler Plugin - Java compiler

## Example Test Output

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
    public void testDivideByZeroThrowsException() {
        assertThrows(IllegalArgumentException.class, () -> {
            Calculator.divide(5, 0);
        });
    }
}
```

## Quick Start

1. Install JDK and Maven (see above)
2. Run `mvn clean install` in terminal to download dependencies
3. Open `Calculator.java` and generate tests
4. Tests will be created in `src/test/java/com/testcase/`
5. Run tests via extension or `mvn test`

## Troubleshooting

**"java is not recognized"**
- Add Java bin directory to PATH
- Windows: `C:\Program Files\Java\jdk-11\bin`
- Restart VS Code after PATH changes

**"mvn is not recognized"**
- Add Maven bin directory to PATH
- Windows: `C:\Program Files\apache-maven-3.9.0\bin`
- Restart VS Code

**"Cannot find symbol"**
- Ensure source file is in correct package: `package com.testcase;`
- Run `mvn compile` to compile source code first
- Check import statements match package structure
