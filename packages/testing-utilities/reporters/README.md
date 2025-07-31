# Live Progress Reporter

A custom Playwright reporter designed for the Yggdrasil educational platform's testing framework.

## Features

✅ **Live Progress Updates**

- Shows "🔄 RUNNING: Test Name" for each test as it starts
- Real-time progress counter `[completed/total %]`
- Immediate "✓ PASS/❌ FAIL: Test Name (duration)" feedback

✅ **Beautiful Output**

- Colored terminal output with consistent styling
- Suite organization by test file
- Clean test name formatting (removes technical details)
- Professional summary with platform branding

✅ **Comprehensive Tracking**

- Test duration measurement
- Success rate calculation
- Average test time metrics
- Failed test summary (when applicable)

## Usage

The reporter is automatically used by the quiet test runner:

```bash
npm run test:quiet  # Uses live progress reporter
```

Or directly with Playwright:

```bash
npx playwright test --reporter=./reporters/live-progress-reporter.js
```

## Configuration

The reporter can be configured by modifying the options in `live-progress-reporter.js`:

```javascript
const options = {
  showProgress: true, // Show [completed/total %] counter
  showDuration: true, // Show test duration in output
  cleanTestNames: true, // Remove technical details from test names
  maxTestNameLength: 80, // Maximum characters for test names
};
```

## Output Example

```
🧪 Yggdrasil Test Suite - Live Progress Mode
📊 Total tests: 7
⚙️  Configuration: 1 worker(s), 100000ms timeout

📁 Auth Security
[0/7 0%] 🔄 RUNNING: Student login
[1/7 14%] ✓ PASS: Student login (6.7s)
[1/7 14%] 🔄 RUNNING: Student accesses courses
[2/7 29%] ✓ PASS: Student accesses courses (6.0s)

======================================================================
🏁 YGGDRASIL TEST SUITE RESULTS
======================================================================
⏱️  Total Duration: 0m 49s
🧪 Tests Executed: 7
✅ Passed: 7
❌ Failed: 0
📊 Success Rate: 100%
⚡ Average Test Time: 7s

🎉 ALL TESTS PASSED! Platform is stable.
======================================================================
```

## Technical Details

- **Framework**: Custom Playwright Reporter implementing the Reporter interface
- **Dependencies**: `chalk` for colored output
- **Methods**: `onBegin`, `onTestBegin`, `onTestEnd`, `onEnd`, `printsToStdio`
- **Integration**: Replaces complex regex parsing with native Playwright lifecycle hooks
- **Compatibility**: Works with existing Yggdrasil test infrastructure

## Benefits Over Previous Implementation

1. **Eliminated Complex Parsing**: No more regex parsing of stdout
2. **Native Integration**: Uses Playwright's built-in reporter lifecycle
3. **Real-time Feedback**: Live status updates during test execution
4. **Better Error Handling**: Direct access to test results and errors
5. **Cleaner Code**: Simplified test runner script
6. **Enhanced UX**: Professional, colored output with progress tracking

## Maintenance

The reporter is designed to be maintenance-free. It automatically adapts to:

- New test files added to the suite
- Changes in test names or structure
- Different test execution times
- Various test outcomes (pass/fail/timeout/skip)

For debugging or modifications, see the inline comments in `live-progress-reporter.js`.
