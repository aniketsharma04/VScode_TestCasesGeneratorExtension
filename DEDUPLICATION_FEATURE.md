# Test Case Deduplication Feature

## Overview
Implemented a comprehensive test case deduplication system to prevent duplicate tests when generating multiple batches. The system uses a hybrid approach combining context-aware AI generation and post-generation deduplication.

## Key Features

### 1. Predefined Batch Size
- **Constant**: `TESTS_PER_GENERATION = 12`
- Each generation produces exactly 12 tests for systematic coverage
- Predictable behavior: 12 → 24 → 36 → 48 tests

### 2. Context-Aware Generation
- AI is informed about existing tests when generating more
- Prevents duplicate patterns at the generation phase
- Existing test names are passed to the AI with instructions to avoid duplication

### 3. Post-Generation Deduplication
- Filters out duplicates that slip through AI generation
- Uses multiple similarity detection methods:
  - Exact name matching (case-insensitive)
  - Fuzzy string matching (>80% similarity using Levenshtein distance)
  - Normalized test signatures

### 4. Statistics Display
- Shows unique tests vs duplicates removed
- Badge displays: "✓ 10 unique (2 duplicates removed)"
- Detailed notification on generation

## Implementation Details

### Modified Files

#### 1. `src/testCaseGenerator.ts`
**New Additions:**
- `TESTS_PER_GENERATION = 12` constant
- `deduplicateTests()` - Main deduplication function
- `normalizeTestSignature()` - Creates comparable test signatures
- `isSimilarTest()` - Fuzzy matching for similar tests
- `calculateStringSimilarity()` - Levenshtein distance calculation
- `levenshteinDistance()` - String distance algorithm

**Modified Functions:**
- `generateTests()` - Now accepts `existingTests?: TestCase[]` parameter
- `generateWithClaude()` - Accepts and passes existingTests
- `generateWithGemini()` - Accepts and passes existingTests
- `buildTestPrompt()` - Incorporates existing tests into AI prompt

**Deduplication Flow:**
```typescript
// 1. Generate tests with AI (context-aware)
const tests = parseTestCases(aiResponse, language, testFramework);

// 2. Deduplicate against existing tests
if (existingTests && existingTests.length > 0) {
    const result = deduplicateTests(tests.testCases, existingTests);
    tests.testCases = result.uniqueTests;
    duplicateCount = result.duplicateCount;
}

// 3. Return with metadata
return {
    ...tests,
    metadata: {
        duplicatesRemoved: duplicateCount,
        totalGenerated: tests.testCases.length + duplicateCount,
        uniqueTests: tests.testCases.length
    }
};
```

#### 2. `src/types.ts`
**Modified Interface:**
```typescript
export interface GeneratedTests {
    // ... existing properties
    metadata?: {
        duplicatesRemoved: number;
        totalGenerated: number;
        uniqueTests: number;
    };
}
```

#### 3. `src/webviewProvider.ts`
**New Features:**
- `PanelContext` interface to store generation context
- `panelContexts` Map to track code/config for each panel
- `handleGenerateMore()` - Handler for "Generate More" button
- Context storage in `createTestCasePanel()`
- Statistics badge in header
- "Generate More (12 Tests)" button in actions

**HTML Changes:**
```html
<!-- Badge showing deduplication stats -->
<span class="badge badge-success">
    ✓ ${tests.metadata.uniqueTests} unique 
    (${tests.metadata.duplicatesRemoved} duplicates removed)
</span>

<!-- Generate More button -->
<button id="generateMore" class="btn btn-accent">
    <span class="icon">➕</span> Generate More (12 Tests)
</button>
```

#### 4. `src/extension.ts`
**Modified Calls:**
- `createTestCasePanel()` now receives `code` and `config` parameters
- Both generate commands updated to pass context

#### 5. `media/script.js`
**New Function:**
```javascript
function generateMore() {
    vscode.postMessage({
        command: 'generateMore',
        existingTests: testData.testCases
    });
}
```

**Event Listener:**
- Added listener for "Generate More" button
- Sends existing tests to backend

#### 6. `media/styles.css`
**New Styles:**
```css
.btn-accent {
    background-color: #28a745; /* Green for "Generate More" */
    color: white;
}

.badge-success {
    background-color: #28a745;
    color: white;
}
```

## User Workflow

### Initial Generation
1. User selects code and runs "Generate Test Cases"
2. Extension generates 12 tests
3. Panel displays tests with stats

### Generate More Tests
1. User clicks "Generate More (12 Tests)" button
2. Extension:
   - Retrieves stored code and config
   - Passes existing 12 tests to AI
   - Generates 12 new tests (context-aware)
   - Deduplicates against existing tests
   - Merges unique tests with existing ones
3. Panel updates with all tests (e.g., 22 total if 2 duplicates removed)
4. Notification shows: "✅ Generated 10 new tests (2 duplicates removed). Total: 22 tests"

### Repeat Process
- Can click "Generate More" multiple times
- Each time generates exactly 12 tests
- Deduplication ensures quality
- Systematic coverage: 12 → 24 → 36 → 48 → ...

## Similarity Detection Algorithm

### Exact Match
```typescript
const signature = test.name.toLowerCase().trim();
// Compare signatures for exact match
```

### Fuzzy Match (Levenshtein Distance)
```typescript
// Example: "testAddition" vs "testAddNumbers"
const similarity = calculateStringSimilarity(name1, name2);
if (similarity > 0.8) {
    // Consider as duplicate
}
```

**Formula:**
```
similarity = (longerLength - levenshteinDistance) / longerLength
```

### Threshold Values
- Exact match: 100% similarity
- Fuzzy match: >80% similarity (configurable)

## Benefits

### For Users
1. **No Duplicate Tests**: Clean, unique test cases every time
2. **Predictable Batches**: Always 12 tests per generation
3. **Systematic Coverage**: Controlled expansion of test suite
4. **Transparency**: See exactly how many duplicates were filtered

### For Development
1. **Token Efficiency**: Consistent API usage
2. **Quality Control**: Multi-layer duplicate prevention
3. **Scalability**: Can generate hundreds of unique tests
4. **Maintainability**: Clear separation of concerns

## Example Scenario

### Generation 1
```
Input: Calculator code
Output: 12 tests (addition, subtraction, multiplication, division, edge cases, errors)
Display: "Total: 12 tests"
```

### Generation 2
```
Input: Same Calculator code + 12 existing tests
AI Prompt: "Avoid these 12 tests: [list]. Generate 12 NEW tests."
AI Output: 12 tests (some overlaps like "test addition with negatives")
Deduplication: Removes 2 similar tests
Final Output: 10 unique tests merged with existing
Display: "✓ 10 unique (2 duplicates removed). Total: 22 tests"
```

### Generation 3
```
Input: Same Calculator code + 22 existing tests
Output: 12 more unique tests
Total: 34 tests (all unique)
```

## Configuration

### Adjusting Batch Size
To change the number of tests per generation:
```typescript
// In src/testCaseGenerator.ts
const TESTS_PER_GENERATION = 15; // Change from 12 to 15
```

### Adjusting Similarity Threshold
To make deduplication more/less strict:
```typescript
// In isSimilarTest() function
if (similarity > 0.85) { // Change from 0.8 to 0.85 (stricter)
    return true;
}
```

## Testing Checklist

- [ ] Generate initial 12 tests for JavaScript code
- [ ] Click "Generate More" → verify 12 more tests generated
- [ ] Check statistics badge shows duplicates removed
- [ ] Verify notification displays correct counts
- [ ] Test with Python code
- [ ] Test with Java code
- [ ] Generate 4 batches (48 tests total)
- [ ] Verify no obvious duplicates in final set
- [ ] Check panel persists after VS Code restart

## Future Enhancements

1. **Customizable Batch Size**: UI option to choose 6, 12, or 24 tests
2. **Smart Suggestions**: AI suggests which areas need more coverage
3. **Test Priority**: Mark certain test types for more generation
4. **Export Statistics**: Download deduplication report
5. **Cross-File Deduplication**: Avoid duplicates across multiple test files

## Performance Considerations

### Memory
- Stores code and config in `panelContexts` Map
- Cleaned up when panel is disposed
- Minimal overhead (<1KB per panel)

### Computation
- Levenshtein distance: O(n*m) where n,m are string lengths
- Only computed for potential duplicates
- Fast for typical test names (10-50 characters)

### API Usage
- Consistent 12-test generation = predictable token usage
- Context-aware prompts reduce duplicates at source
- Fewer wasted API calls

## Conclusion

This deduplication feature provides a robust, user-friendly system for generating large test suites without duplicates. The hybrid approach (AI context + post-deduplication) ensures high quality while the predefined batch size (12 tests) provides predictability and systematic coverage.
