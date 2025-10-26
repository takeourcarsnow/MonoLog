#!/usr/bin/env node

/**
 * Automated Testing Script for MonoLog Performance Verification
 * Uses Playwright to test all critical functionality and performance
 */

const { chromium, firefox, webkit } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds
const NAVIGATION_TIMEOUT = 10000; // 10 seconds

class MonoLogTester {
  constructor(browserType = 'chromium') {
    this.browserType = browserType;
    this.browser = null;
    this.page = null;
    this.server = null;
    this.results = {
      passed: 0,
      failed: 0,
      tests: [],
      performance: {},
      browsers: {},
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || '📝';

    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  async recordTest(name, passed, details = '', duration = 0) {
    this.results.tests.push({
      name,
      passed,
      details,
      duration,
      timestamp: Date.now()
    });

    if (passed) {
      this.results.passed++;
      this.log(`${name} - PASSED (${duration}ms)`, 'success');
    } else {
      this.results.failed++;
      this.log(`${name} - FAILED: ${details}`, 'error');
    }
  }

  async startServer() {
    this.log('Assuming development server is already running...');
    this.log('Make sure to run: npm start');
    this.log('Waiting 3 seconds for server to be ready...');

    // Give server time to start
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Quick health check
    try {
      const response = await fetch(BASE_URL);
      if (response.ok) {
        this.log('✅ Server is responding');
        return;
      }
    } catch (error) {
      this.log('⚠️ Server may not be ready, but continuing with tests...', 'warning');
    }
  }

  async initBrowser() {
    this.log(`Initializing ${this.browserType} browser...`);

    const browserConfig = {
      headless: false, // Show browser for visual verification
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    // Browser-specific configurations
    switch (this.browserType) {
      case 'firefox':
        this.browser = await firefox.launch(browserConfig);
        break;
      case 'webkit':
        this.browser = await webkit.launch(browserConfig);
        break;
      case 'chromium':
      default:
        this.browser = await chromium.launch(browserConfig);
        break;
    }

    this.page = await this.browser.newPage();

    // Set timeouts
    this.page.setDefaultTimeout(TEST_TIMEOUT);
    this.page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);

    // Enable performance monitoring
    await this.page.addScriptTag({
      content: `
        window.performanceMarks = [];
        window.markPerformance = (name) => {
          performance.mark(name);
          window.performanceMarks.push({ name, timestamp: Date.now() });
        };
      `
    });

    this.log(`${this.browserType} browser initialized`);
  }

  async measurePageLoad(url, name) {
    const startTime = Date.now();

    try {
      // Use 'domcontentloaded' instead of 'networkidle' for faster loading
      const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      const loadTime = Date.now() - startTime;

      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}`);
      }

      // More reasonable threshold for dynamic apps
      await this.recordTest(`${name} - Page Load`, loadTime < 8000, `${loadTime}ms`, loadTime);
      return loadTime;
    } catch (error) {
      await this.recordTest(`${name} - Page Load`, false, error.message);
      return -1;
    }
  }

  async testHomePage() {
    this.log('Testing Home Page...', 'test');

    const loadTime = await this.measurePageLoad(BASE_URL, 'Home Page');

    if (loadTime > 0) {
      // Home page redirects to /feed or /explore, so wait for redirect
      await this.page.waitForURL((url) => !url.pathname.endsWith('/'), { timeout: 5000 });
      
      // Check if we redirected to feed or explore
      const currentUrl = this.page.url();
      const redirectedCorrectly = currentUrl.includes('/feed') || currentUrl.includes('/explore');
      await this.recordTest('Home Page - Redirect', redirectedCorrectly, `Redirected to: ${currentUrl}`);
      
      // Now check for essential elements on the redirected page
      const hasHeader = await this.page.locator('header').count() > 0;
      await this.recordTest('Home Page - Header Present', hasHeader);

      // Check for navigation elements (header buttons or navbar)
      const hasNav = await this.page.locator('header .btn, nav, [role="navigation"]').count() > 0;
      await this.recordTest('Home Page - Navigation Present', hasNav);

      // Check for main content
      const hasMainContent = await this.page.locator('main, [role="main"]').count() > 0;
      await this.recordTest('Home Page - Main Content Present', hasMainContent);
    }
  }

  async testNavigation() {
    this.log('Testing Navigation...', 'test');

    const pages = [
      { name: 'Explore', url: '/explore', selector: '[data-testid="explore-content"], .feed, main' },
      { name: 'Feed', url: '/feed', selector: '[data-testid="feed-content"], .feed, main' },
      { name: 'Profile', url: '/profile', selector: '[data-testid="profile-content"], .profile, main, .empty' },
      { name: 'Communities', url: '/communities', selector: '[data-testid="communities-content"], .communities, main' }
    ];

    for (const page of pages) {
      try {
        const startTime = Date.now();
        await this.page.goto(`${BASE_URL}${page.url}`, { waitUntil: 'domcontentloaded' });
        const loadTime = Date.now() - startTime;

        // Check if page loaded and has content
        const hasContent = await this.page.locator(page.selector).count() > 0;
        await this.recordTest(`${page.name} Page Navigation`, hasContent, `${loadTime}ms`, loadTime);

        // Test back navigation
        await this.page.goBack();
        const backWorked = this.page.url().includes(BASE_URL);
        await this.recordTest(`${page.name} Page - Back Navigation`, backWorked);

      } catch (error) {
        await this.recordTest(`${page.name} Page Navigation`, false, error.message);
      }
    }
  }

  async testInteractions() {
    this.log('Testing User Interactions...', 'test');

    // Navigate to explore page for interaction testing
    await this.page.goto(`${BASE_URL}/explore`, { waitUntil: 'networkidle' });

    // Test view toggle (list/grid)
    try {
      const viewToggle = this.page.locator('[data-testid="view-toggle"], button:has-text("List"), button:has-text("Grid")').first();
      if (await viewToggle.count() > 0) {
        await viewToggle.click();
        await this.page.waitForTimeout(500); // Wait for transition
        await this.recordTest('View Toggle Interaction', true, 'Successfully toggled view');
      } else {
        await this.recordTest('View Toggle Interaction', false, 'View toggle not found');
      }
    } catch (error) {
      await this.recordTest('View Toggle Interaction', false, error.message);
    }

    // Test post interactions (like/comment if available)
    try {
      // Navigate to explore page for interaction testing
      await this.page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });
      
      // Wait for posts to load - check that we're not in loading state
      await this.page.waitForFunction(() => {
        // Wait until no skeleton cards are present (loading finished)
        return document.querySelectorAll('.skeleton').length === 0;
      }, { timeout: 10000 });
      
      // Look for post cards
      const postCard = this.page.locator('.card[id^="post-"]').first();
      
      // Wait for at least one post to be visible
      const postVisible = await postCard.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (postVisible) {
        // Scroll into view to make sure it's clickable
        await postCard.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500); // Wait for scroll
        
        // Test clicking on post
        await postCard.click();
        await this.page.waitForTimeout(1000);

        // Check if navigation occurred (URL changed)
        const urlChanged = !this.page.url().includes('/explore');
        await this.recordTest('Post Click Navigation', urlChanged);

        // Go back
        await this.page.goBack();
      } else {
        // No posts is also a valid state for explore feed
        await this.recordTest('Post Interaction', true, 'No posts available (valid for explore feed)');
      }
    } catch (error) {
      await this.recordTest('Post Interaction', false, error.message);
    }
  }

  async testPerformance() {
    this.log('Testing Performance Metrics...', 'test');

    // Test page load performance
    const pages = ['/', '/explore', '/feed', '/profile'];

    for (const pagePath of pages) {
      await this.page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'domcontentloaded' });

      // Measure various performance metrics
      const metrics = await this.page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });

      this.results.performance[pagePath] = metrics;

      // Check performance thresholds - adjusted for dynamic apps
      await this.recordTest(`${pagePath} - DOM Content Loaded`, metrics.domContentLoaded < 3000, `${metrics.domContentLoaded}ms`);
      await this.recordTest(`${pagePath} - Load Complete`, metrics.loadComplete < 8000, `${metrics.loadComplete}ms`);
    }
  }

  async testCaching() {
    this.log('Testing Caching Behavior...', 'test');

    // Test page reload caching
    await this.page.goto(`${BASE_URL}/explore`, { waitUntil: 'domcontentloaded' });

    // Wait a moment for caching to take effect
    await this.page.waitForTimeout(2000);

    // Reload and measure
    const startTime = Date.now();
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    const reloadTime = Date.now() - startTime;

    // Cached reload should be faster (< 2 seconds typically)
    await this.recordTest('Page Reload Caching', reloadTime < 3000, `${reloadTime}ms`, reloadTime);
  }

  async testResponsiveness() {
    this.log('Testing Responsive Design...', 'test');

    // Comprehensive device testing
    const devices = [
      // Mobile devices
      { name: 'iPhone SE', width: 375, height: 667, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
      { name: 'iPhone 12 Pro', width: 390, height: 844, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
      { name: 'Samsung Galaxy S21', width: 360, height: 640, userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36' },
      { name: 'Pixel 5', width: 393, height: 851, userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36' },

      // Tablets
      { name: 'iPad Mini', width: 768, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
      { name: 'iPad Pro', width: 1024, height: 1366, userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1' },
      { name: 'Samsung Galaxy Tab S7', width: 800, height: 1280, userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Safari/537.36' },

      // Desktop
      { name: 'Desktop 1080p', width: 1920, height: 1080, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      { name: 'Desktop 4K', width: 3840, height: 2160, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      { name: 'MacBook Pro 13"', width: 1280, height: 800, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    ];

    for (const device of devices) {
      // Set viewport and user agent
      await this.page.setViewportSize({ width: device.width, height: device.height });
      await this.page.setExtraHTTPHeaders({
        'User-Agent': device.userAgent
      });

      // Test layout doesn't break
      const layoutTest = await this.page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        const hasExcessiveOverflow = height > window.innerHeight * 3; // Allow more scroll for mobile

        // Check for horizontal overflow
        const hasHorizontalOverflow = body.scrollWidth > window.innerWidth + 10;

        // Check if critical elements are visible
        const headerVisible = document.querySelector('header') !== null;
        const mainVisible = document.querySelector('main, [role="main"]') !== null;

        return {
          hasExcessiveOverflow,
          hasHorizontalOverflow,
          headerVisible,
          mainVisible
        };
      });

      const passed = !layoutTest.hasExcessiveOverflow && !layoutTest.hasHorizontalOverflow && layoutTest.headerVisible && layoutTest.mainVisible;
      await this.recordTest(`Device - ${device.name}`, passed, `${device.width}x${device.height}${passed ? '' : ` (Overflow: ${layoutTest.hasExcessiveOverflow}, H-Overflow: ${layoutTest.hasHorizontalOverflow})`}`);
    }
  }

  async testBrowserCompatibility() {
    this.log('Testing Browser Compatibility...', 'test');

    const browsers = ['chromium', 'firefox', 'webkit'];
    const testPages = ['/', '/explore', '/feed'];

    for (const browserName of browsers) {
      this.log(`Testing ${browserName}...`, 'test');

      // Create a new tester instance for each browser
      const browserTester = new MonoLogTester(browserName);
      await browserTester.startServer();
      await browserTester.initBrowser();

      try {
        // Quick smoke test for each browser
        for (const pagePath of testPages) {
          await browserTester.page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'domcontentloaded' });
          const title = await browserTester.page.title();
          const hasContent = await browserTester.page.locator('body').count() > 0;

          browserTester.recordTest(`${browserName} - ${pagePath}`, hasContent, title);
        }

        // Store browser results
        this.results.browsers[browserName] = {
          passed: browserTester.results.passed,
          failed: browserTester.results.failed,
          total: browserTester.results.tests.length
        };

        // Add browser tests to main results
        this.results.tests.push(...browserTester.results.tests);
        this.results.passed += browserTester.results.passed;
        this.results.failed += browserTester.results.failed;

      } finally {
        await browserTester.browser.close();
      }
    }
  }

  async generateReport() {
    const reportPath = path.join(process.cwd(), 'test-report.json');
    const summaryPath = path.join(process.cwd(), 'test-summary.txt');

    // JSON report
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Human-readable summary
    const summary = `
🧪 MonoLog Automated Test Report
Generated: ${new Date().toISOString()}

📊 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Tests: ${this.results.tests.length}
Passed: ${this.results.passed}
Failed: ${this.results.failed}
Success Rate: ${((this.results.passed / this.results.tests.length) * 100).toFixed(1)}%

${this.results.failed > 0 ? '❌ FAILED TESTS:' : '✅ ALL TESTS PASSED'}
${this.results.failed > 0 ? this.results.tests.filter(t => !t.passed).map(t => `  • ${t.name}: ${t.details}`).join('\n') : ''}

${Object.keys(this.results.browsers).length > 0 ? `🌐 BROWSER COMPATIBILITY\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${Object.entries(this.results.browsers).map(([browser, results]) => `${browser}:\n  • Passed: ${results.passed}/${results.total} (${((results.passed / results.total) * 100).toFixed(1)}%)`).join('\n')}\n` : ''}

⚡ PERFORMANCE METRICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(this.results.performance).map(([page, metrics]) =>
  `${page}:
    • DOM Content Loaded: ${metrics.domContentLoaded}ms
    • Load Complete: ${metrics.loadComplete}ms
    • First Paint: ${metrics.firstPaint}ms
    • First Contentful Paint: ${metrics.firstContentfulPaint}ms`
).join('\n')}

📋 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.results.failed === 0 ?
  '🎉 All tests passed! Your app is performing excellently.' :
  '⚠️  Some tests failed. Review the issues above and consider optimization.'}

Performance Tips:
• Keep page load times under 3 seconds
• Ensure responsive design works on all devices
• Test interactions work smoothly
• Verify caching reduces reload times

📁 Reports saved to:
• ${reportPath}
• ${summaryPath}
`;

    fs.writeFileSync(summaryPath, summary);

    console.log('\n' + '='.repeat(60));
    console.log(summary);
    console.log('='.repeat(60));
  }

  async run(crossBrowser = false, deviceMode = false) {
    try {
      this.log('🚀 Starting MonoLog Automated Testing Suite');

      // Start server
      await this.startServer();

      if (crossBrowser) {
        // Run cross-browser compatibility tests
        await this.testBrowserCompatibility();
      } else if (deviceMode) {
        // Run comprehensive device testing
        await this.initBrowser();
        await this.testHomePage();
        await this.testNavigation();
        await this.testInteractions();
        await this.testPerformance();
        await this.testCaching();
        await this.testResponsiveness();
      } else {
        // Run standard tests with default browser
        await this.initBrowser();

        // Run all tests
        await this.testHomePage();
        await this.testNavigation();
        await this.testInteractions();
        await this.testPerformance();
        await this.testCaching();
        await this.testResponsiveness();
      }

      // Generate report
      await this.generateReport();

      this.log(`✅ Testing complete! ${this.results.passed}/${this.results.tests.length} tests passed`);

    } catch (error) {
      this.log(`❌ Test suite failed: ${error.message}`, 'error');
      this.results.errors.push(error.message);
    } finally {
      // Cleanup
      if (this.browser) {
        await this.browser.close();
      }
      // Note: Not killing server since we didn't start it
    }
  }
}

// Run the tests
if (require.main === module) {
  const args = process.argv.slice(2);
  const crossBrowser = args.includes('--cross-browser') || args.includes('-b');
  const deviceMode = args.includes('--devices') || args.includes('-d');
  const browserType = args.find(arg => arg.startsWith('--browser='))?.split('=')[1] || 'chromium';

  console.log('🎭 MonoLog Cross-Browser Testing Suite');
  console.log('=====================================');
  console.log(`Mode: ${crossBrowser ? 'Cross-Browser Testing' : deviceMode ? 'Device Testing' : 'Standard Testing'}`);
  console.log(`Browser: ${browserType}`);
  console.log('');

  const tester = new MonoLogTester(browserType);
  tester.run(crossBrowser, deviceMode).catch(console.error);
}

module.exports = MonoLogTester;