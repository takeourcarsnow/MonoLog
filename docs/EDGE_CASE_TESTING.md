# 🔥 Edge Case Testing Suite

Comprehensive automated testing script that simulates real user interactions, edge cases, and stress scenarios throughout the MonoLog application.

## Features

This script tests **everything** that could break after major improvements:

### 🧭 Navigation Testing
- Rapid page switching stress test
- Browser back/forward button spam
- Invalid route handling (404 pages)
- Protected route access
- Concurrent navigation during interactions

### 📝 Form Testing
- Empty form submissions
- Special characters and XSS attempts
- Extremely long text inputs
- Search with edge case queries
- SQL injection attempts
- Unicode and emoji handling

### 🖼️ Image Upload & Editor
- Upload valid images (uses logo.png)
- Multiple rapid uploads
- Photo editor tool interactions
- Canvas click and drag operations
- Undo/redo spam testing
- Editor state management

### 📜 Scrolling
- Rapid scrolling stress test
- Infinite scroll behavior
- Momentum scrolling simulation
- Scroll-to-bottom and back cycles

### 📱 Responsive Design
- Extreme viewport sizes (1x1 to 5000px)
- Ultra-wide and extra-tall displays
- Rapid viewport changes
- Orientation stress testing

### 🖱️ User Interactions
- Rapid button clicking (20+ clicks)
- Double/triple click handling
- Right-click context menu
- Keyboard navigation spam
- Hover spam testing

### 🌐 Network Conditions
- Offline mode simulation
- Slow network handling
- Connection loss recovery

### ⚡ Performance & Memory
- Extensive navigation (35+ page loads)
- Memory stress testing
- Performance metrics collection

### ♿ Accessibility
- Keyboard-only navigation
- ARIA labels verification
- Image alt text checking
- Semantic HTML landmarks

### 🔄 Concurrent Actions
- Simultaneous user actions
- Navigation during interactions
- Race condition testing

## Usage

### Prerequisites

Make sure the development server is running:
```bash
npm run dev
```

### Run Tests

**Standard Mode (Visible Browser):**
```bash
npm run test:edge-cases
```

**Headless Mode (Background):**
```bash
npm run test:edge-headless
```

**Slow Motion (For Debugging):**
```bash
npm run test:edge-slow
```

**🎨 Photo Editor Intensive Mode:**
```bash
npm run test:photo-editor              # Visible browser
npm run test:photo-editor-headless     # Background mode
```

This mode runs 10 comprehensive photo editor stress tests:
1. Opening editor with image
2. Extreme tool switching (100+ rapid switches)
3. Canvas stress test (500+ drawing operations including spirals, zigzags)
4. Undo/Redo extreme stress (100+ operations)
5. Tool + Drawing combinations (20 cycles)
6. Keyboard shortcuts spam (30 presses)
7. Editor state persistence check
8. Zoom/Pan stress test (40+ operations)
9. Memory leak detection (10 draw-undo cycles)
10. Save functionality after stress

**Direct Script Execution:**
```bash
node scripts/edge-case-test.js
node scripts/edge-case-test.js --headless
node scripts/edge-case-test.js --slow
node scripts/edge-case-test.js --editor-only
```

## Test Credentials

The script uses these credentials (hardcoded):
- **Email:** ngi04j7n9f@daouse.com
- **Password:** asdngi04j7n9f@daouse.com

## Output Files

After running, the script generates:

1. **edge-case-test-report.json** - Complete JSON report with all test results
2. **edge-case-test-summary.txt** - Human-readable summary
3. **test-screenshots/** - Screenshots of any failures

## Test Categories

Results are organized by category:
- `auth` - Authentication and login
- `navigation` - Page navigation and routing
- `forms` - Form submissions and validation
- `upload` - File upload functionality
- `editor` - Photo editor interactions
- `scroll` - Scrolling behavior
- `responsive` - Responsive design
- `interaction` - User interactions
- `network` - Network conditions
- `performance` - Performance metrics
- `accessibility` - Accessibility features
- `concurrency` - Concurrent actions

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║           🔥 MONOLOG EDGE CASE TEST REPORT 🔥                 ║
╚════════════════════════════════════════════════════════════════╝

Generated: 2025-11-05T...
Duration: 120.45s

╔════════════════════════════════════════════════════════════════╗
║                         📊 SUMMARY                             ║
╚════════════════════════════════════════════════════════════════╝

Total Tests: 127
✅ Passed: 124
❌ Failed: 3
Success Rate: 97.6%

...
```

## What Gets Tested

### Photo Upload Flow
1. Navigates to `/upload`
2. Uploads `logo.png` from `public/` folder
3. Verifies image preview appears
4. Opens photo editor
5. Tests all editor tools
6. Performs random canvas interactions
7. Tests undo/redo functionality
8. Closes editor

### Edge Cases Covered
- **Empty inputs** - Tests validation
- **Malicious inputs** - XSS, SQL injection attempts
- **Extreme sizes** - 1x1 to 5000px viewports
- **Rapid actions** - Clicks, scrolls, navigation
- **Network issues** - Offline, slow connection
- **Memory stress** - Multiple page loads
- **Concurrent operations** - Multiple actions at once

## Customization

Edit `scripts/edge-case-test.js` to:
- Change test credentials
- Add more test scenarios
- Modify timeouts
- Add custom edge cases
- Change screenshot behavior

## Troubleshooting

**Server not running:**
```
Make sure to run: npm run dev
```

**Login fails:**
- Verify credentials are correct
- Check if auth form selectors match your app
- Ensure test account exists in database

**Tests timeout:**
- Increase timeout values in script
- Use `--slow` mode for debugging
- Check network connectivity

**Screenshots not saved:**
- Check if `test-screenshots/` directory exists
- Verify write permissions
- Check disk space

## Tips

- Run in **visible mode** first to see what's happening
- Use **slow mode** to debug specific failures
- Check **console errors** in the report
- Review **screenshots** of failures
- Run after **major changes** to catch regressions

## CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Run Edge Case Tests
  run: |
    npm run dev &
    sleep 10
    npm run test:edge-headless
```

## Coverage

This script provides **comprehensive coverage** of:
- ✅ All major pages
- ✅ All interactive elements
- ✅ All form inputs
- ✅ Upload and editor
- ✅ Responsive behavior
- ✅ Error handling
- ✅ Performance
- ✅ Accessibility
- ✅ Edge cases

It's like having a real user click **everywhere** and try **everything**! 🚀
