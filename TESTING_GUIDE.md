# Testing Guide - Smart Generation System

## 🧪 How to Test the New Features

### Test 1: Initial Generation (12 Tests)
1. Open `example.py` (or any code file)
2. Press `Ctrl+Shift+P` → "Test Generator: Generate Test Cases"
3. **Expected:** Panel shows exactly 12 tests
4. **Verify:** Notification says "✅ Generated 12 test cases successfully!"
5. **Check:** Badge shows "Total: 12 tests" (no extra stats)

---

### Test 2: Generate More (Round 2 → 24 Tests)
1. In the test panel, click **"➕ Generate More (12 Tests)"**
2. Wait 10-20 seconds
3. **Expected:** Panel updates to show 24 tests total
4. **Verify:** Notification says "✅ Generated 12 more tests. Total: 24 tests"
5. **Check:** No mention of "duplicates" or "variations"

---

### Test 3: Multiple Rounds (36, 48, 60 Tests)
1. Click "Generate More" button 3 more times
2. **Expected after each click:**
   - Round 3: "Total: 36 tests"
   - Round 4: "Total: 48 tests"
   - Round 5: "Total: 60 tests"
3. **Verify:** Each notification shows "Generated 12 more tests"
4. **Check:** All tests are displayed (scrollable)

---

### Test 4: Simple Code (Low Complexity)
1. Create a simple file with 2-3 functions:
```python
def add(a, b):
    return a + b

def subtract(a, b):
    return a - b
```
2. Generate tests → Should still get 12 tests
3. Click "Generate More" 2-3 times
4. **Expected:** System may use variations after 2-3 rounds
5. **Verify:** User sees no difference (still "12 more tests")

---

### Test 5: Complex Code (High Complexity)
1. Use the existing `example.js` or `example.py` (multiple functions)
2. Generate tests repeatedly (5+ rounds)
3. **Expected:** Can generate 60+ tests consistently
4. **Verify:** Quality remains high across all rounds

---

### Test 6: Check Developer Console (Optional)
1. Help → Toggle Developer Tools
2. Go to Console tab
3. Generate tests and click "Generate More"
4. **Look for logs:**
```
Attempt 1: Generated 12, Got 9 unique (75% yield)
Attempt 2: Generated 12, Got 3 unique (25% yield)
Generating 0 variations to reach 12 tests
```
5. **Verify:** Internal logic is working (retries, yield %, variations)

---

### Test 7: Different Languages
Test with multiple languages:

**JavaScript:**
```javascript
function multiply(a, b) {
    return a * b;
}
```

**Python:**
```python
def divide(a, b):
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```

**TypeScript:**
```typescript
function greet(name: string): string {
    return `Hello, ${name}!`;
}
```

**Verify:** All languages work with 12-test generation

---

## ✅ Success Criteria

### UI Checks:
- [x] Badge shows "Total: X tests" only
- [x] No "duplicates removed" or "variations" text
- [x] Notification says "Generated 12 more tests"
- [x] "Generate More" button visible and clickable
- [x] Tests displayed in clean, organized format

### Functional Checks:
- [x] Initial generation: exactly 12 tests
- [x] Each "Generate More": adds exactly 12 tests
- [x] Works across 5+ rounds (60+ tests)
- [x] No crashes or errors
- [x] Consistent 10-20 second generation time

### Quality Checks:
- [x] Tests are syntactically correct
- [x] Tests are logically diverse
- [x] No obvious duplicate tests visible
- [x] Test names are meaningful
- [x] Code is properly formatted

---

## 🐛 What to Watch For

### Potential Issues:
1. **Less than 12 tests displayed** → Check console for errors
2. **Duplicate tests visible** → Variations may need tuning
3. **Very slow generation (>30s)** → API may be slow, retry
4. **Error messages** → Check API key, internet connection
5. **Compilation warnings** → Safe to ignore `.js` import warning

---

## 📊 Expected Console Output

### Round 1 (Fresh Code):
```
Attempt 1: Generated 12, Got 12 unique (100% yield)
```

### Round 2 (Some Overlap):
```
Attempt 1: Generated 12, Got 10 unique (83% yield)
Attempt 2: Generated 12, Got 2 unique (17% yield)
```

### Round 4 (Low Yield):
```
Attempt 1: Generated 12, Got 6 unique (50% yield)
Generating 6 variations to reach 12 tests
```

### Round 6 (Very Low Yield):
```
Attempt 1: Generated 12, Got 4 unique (33% yield)
Generating 8 variations to reach 12 tests
```

---

## 🎯 Performance Benchmarks

| Metric | Target | Acceptable Range |
|--------|--------|------------------|
| Tests per generation | 12 | Exactly 12 |
| Generation time | 10-15s | 8-25s |
| API calls per round | 1-2 | Max 2 |
| Rounds before variations | 3-5 | 2-8 |
| Max tests generated | 120+ | Unlimited |

---

## 🔧 Troubleshooting

### Issue: "Only 10 tests shown instead of 12"
**Solution:** Check console for errors. May need to regenerate.

### Issue: "Exact duplicate tests appearing"
**Solution:** Variation logic may need adjustment. File a bug report.

### Issue: "API errors after multiple rounds"
**Solution:** Check API quota. May have hit rate limits.

### Issue: "Very slow after Round 5+"
**Solution:** Expected (more tests to deduplicate). Consider regenerating fresh.

---

## 📝 Test Report Template

After testing, document:

```
Test Date: ___________
VS Code Version: ___________
Extension Version: ___________

✅ Initial Generation (12 tests): Pass/Fail
✅ Generate More (Round 2): Pass/Fail
✅ Generate More (Round 3): Pass/Fail
✅ Generate More (Round 4): Pass/Fail
✅ Generate More (Round 5): Pass/Fail

UI Appearance: Clean/Issues
Generation Speed: Fast/Acceptable/Slow
Test Quality: High/Medium/Low

Issues Found:
1. ___________
2. ___________

Comments:
___________
```

---

## 🚀 Ready to Test!

1. Press **F5** to start Extension Development Host
2. Follow the test scenarios above
3. Report any issues found
4. Enjoy generating comprehensive test suites! 🎉
