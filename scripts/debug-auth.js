import { chromium } from 'playwright';

(async () => {
  const BASE_URL = 'http://localhost:3000';
  const TEST_EMAIL = '2ucmbma6qf@yzcalo.com';
  const TEST_PASSWORD = 'asd2ucmbma6qf@yzcalo.com';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to /profile');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1500);

  console.log('Cookies before login:', await context.cookies(BASE_URL));

  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
  const submitBtn = page.locator('button[type="submit"], .auth-button').first();

  if (await emailInput.count() > 0) {
    await emailInput.fill(TEST_EMAIL);
  }
  if (await passwordInput.count() > 0) {
    await passwordInput.fill(TEST_PASSWORD);
  }
  if (await submitBtn.count() > 0) {
    await submitBtn.click();
  }

  await page.waitForTimeout(4000);

  console.log('URL after submit:', page.url());
  console.log('Cookies after login:', await context.cookies(BASE_URL));

  // Print localStorage/sessionStorage
  const ls = await page.evaluate(() => ({
    localStorage: { ...window.localStorage },
    sessionStorage: { ...window.sessionStorage }
  }));
  console.log('Storage:', ls);

  // Snapshot page HTML for inspection
  const html = await page.content();
  console.log('Page HTML snippet:', html.slice(0, 2000).replace(/\n/g, ' '));

  await browser.close();
  process.exit(0);
})();
