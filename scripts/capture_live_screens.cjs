const path = require('path');
const puppeteer = require('../frontend/node_modules/puppeteer-core');

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || path.join(__dirname, '../docs/screenshots');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function clickButtonWithText(page, text) {
  const success = await page.evaluate((text) => {
    const btns = Array.from(document.querySelectorAll('button, a, [role="button"], .mantine-NavLink-root'));
    const b = btns.find((el) => el.textContent.trim() === text) ||
              btns.find((el) => el.textContent.trim().startsWith(text)) ||
              btns.find((el) => el.textContent.trim().includes(text));
    if (b) {
      b.click();
      return true;
    }
    return false;
  }, text);
  if (!success) throw new Error(`Button or link not found with text: "${text}"`);
}

async function setReactInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.evaluate((selector, value) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Input not found: ${selector}`);
    el.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, selector, value);
}

async function ensureLoggedOut(page) {
  await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('input[placeholder="e.g. 9876543210"]', { timeout: 10000 });
  await delay(600);
}

async function loginAsAdmin(page) {
  const isDashboard = await page.evaluate(() => document.body.innerText.includes('PERSONAL NET BALANCE'));
  if (isDashboard) return;

  await page.waitForSelector('input[placeholder="e.g. 9876543210"]', { timeout: 10000 });
  await setReactInput(page, 'input[placeholder="e.g. 9876543210"]', '9876543210');
  await setReactInput(page, 'input[placeholder="Your password"]', 'password123');
  await delay(200);

  await page.click('button[type="submit"]');
  await page.waitForFunction(() => document.body.innerText.includes('PERSONAL NET BALANCE'), { timeout: 15000 });
  await delay(1200);
}

async function navigateTo(page, tabName, isMobile) {
  if (isMobile) {
    const burger = await page.$('button.mantine-Burger-root');
    if (burger) {
      await burger.click();
      await delay(500);
    }
  }
  await page.evaluate((tabName) => {
    const links = Array.from(document.querySelectorAll('.mantine-NavLink-root, button, a'));
    const found = links.find((el) => el.textContent.trim().startsWith(tabName));
    if (found) found.click();
  }, tabName);
  await delay(1200);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  try {
    // ==========================================
    // 1. DESKTOP LIGHT MODE (1400x900)
    // ==========================================
    console.log('--- 1. DESKTOP LIGHT (1400x900) ---');
    const p1 = await browser.newPage();
    await p1.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
    await p1.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

    // 1.1 Login Screen
    console.log('1.1 Login View');
    await ensureLoggedOut(p1);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_01_login.png'), fullPage: false });

    // Login
    await loginAsAdmin(p1);

    // 1.2 Dashboard
    console.log('1.2 Dashboard');
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_02_dashboard.png'), fullPage: true });

    // 1.3 Rapid SMS Ingestion & Modal
    console.log('1.3 Rapid SMS Dock & Modal');
    const sampleSms = 'Dear UPI user, A/C *5678 debited by Rs 450.00 on 03-Oct-26 by transfer to SWIGGY. Ref 42819012. Bal Rs 18,450.00 - SBI';
    const smsInput = 'input[placeholder*="SMS"]';
    await setReactInput(p1, smsInput, sampleSms);
    await delay(400);

    await p1.evaluate(() => {
      document.querySelector('.tabler-icon-arrow-right').closest('button').click();
    });
    await p1.waitForFunction(() => document.body.innerText.includes('Review Parsed Transaction'), { timeout: 10000 });
    await delay(800);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_03_sms_modal.png'), fullPage: false });

    await p1.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.textContent.includes('Confirm & Record'));
      if (b) b.click();
    });
    await p1.waitForFunction(() => !document.body.innerText.includes('Review Parsed Transaction'), { timeout: 10000 });
    await delay(1000);

    // 1.4 Cash Quick-Entry
    console.log('1.4 Cash Quick-Entry (Chai)');
    await clickButtonWithText(p1, 'Chai ₹20');
    await delay(700);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_04_quick_spend.png'), fullPage: false });
    await delay(1000);

    // 1.5 Transactions View
    console.log('1.5 Transactions');
    await navigateTo(p1, 'Transactions', false);
    await p1.waitForFunction(() => document.body.innerText.includes('Add Transaction'), { timeout: 10000 });
    await delay(1000);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_05_transactions.png'), fullPage: true });

    // 1.6 Add Transaction Modal
    console.log('1.6 Add Transaction Modal');
    await clickButtonWithText(p1, 'Add Transaction');
    await p1.waitForFunction(() => document.body.innerText.includes('Save Transaction'), { timeout: 10000 });
    await delay(800);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_06_transaction_modal.png'), fullPage: false });
    await clickButtonWithText(p1, 'Cancel');
    await delay(500);

    // 1.7 Analytics View
    console.log('1.7 Analytics');
    await navigateTo(p1, 'Analytics', false);
    await p1.waitForFunction(() => document.body.innerText.includes('Expense Category Breakdown'), { timeout: 10000 });
    await delay(2000);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_07_analytics.png'), fullPage: true });

    // 1.8 Family Management View
    console.log('1.8 Family Management');
    await navigateTo(p1, 'Family', false);
    await p1.waitForFunction(() => document.body.innerText.includes('Family Management'), { timeout: 10000 });
    await delay(1000);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_08_family.png'), fullPage: true });

    // 1.9 Add Member Modal
    console.log('1.9 Add Member Modal');
    await clickButtonWithText(p1, 'Add Member');
    await p1.waitForFunction(() => document.body.innerText.includes('Initial Cash Account Name'), { timeout: 10000 });
    await delay(800);
    await p1.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_09_add_member_modal.png'), fullPage: false });
    await clickButtonWithText(p1, 'Cancel');
    await p1.close();

    // ==========================================
    // 2. MOBILE LIGHT MODE (390x844)
    // ==========================================
    console.log('\n--- 2. MOBILE LIGHT (390x844) ---');
    const p2 = await browser.newPage();
    await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p2.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

    // 2.1 Login Screen
    console.log('2.1 Mobile Login');
    await ensureLoggedOut(p2);
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_01_login.png'), fullPage: false });

    // Login
    await loginAsAdmin(p2);

    // 2.2 Dashboard
    console.log('2.2 Mobile Dashboard');
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_02_dashboard.png'), fullPage: true });

    // 2.3 Nav Drawer
    console.log('2.3 Mobile Nav Drawer');
    await p2.evaluate(() => {
      const b = document.querySelector('button.mantine-Burger-root');
      if (b) b.click();
    });
    await delay(700);
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_03_nav_drawer.png'), fullPage: false });
    await p2.evaluate(() => {
      const b = document.querySelector('button.mantine-Burger-root');
      if (b) b.click();
    });
    await delay(500);

    // 2.4 Transactions View (Responsive Stacked Cards)
    console.log('2.4 Mobile Transactions Cards');
    await navigateTo(p2, 'Transactions', true);
    await p2.waitForFunction(() => document.body.innerText.includes('Add Transaction'), { timeout: 10000 });
    await delay(1000);
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_04_transactions.png'), fullPage: true });

    // 2.5 Analytics View
    console.log('2.5 Mobile Analytics');
    await navigateTo(p2, 'Analytics', true);
    await p2.waitForFunction(() => document.body.innerText.includes('Expense Category Breakdown'), { timeout: 10000 });
    await delay(2000);
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_05_analytics.png'), fullPage: true });

    // 2.6 Family Management (Responsive Cards)
    console.log('2.6 Mobile Family');
    await navigateTo(p2, 'Family', true);
    await p2.waitForFunction(() => document.body.innerText.includes('Family Management'), { timeout: 10000 });
    await delay(1000);
    await p2.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_06_family.png'), fullPage: true });
    await p2.close();

    // ==========================================
    // 3. DESKTOP DARK MODE (1400x900)
    // ==========================================
    console.log('\n--- 3. DESKTOP DARK (1400x900) ---');
    const p3 = await browser.newPage();
    await p3.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
    await p3.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    // 3.1 Dark Login
    console.log('3.1 Desktop Dark Login');
    await ensureLoggedOut(p3);
    await p3.evaluate(() => document.documentElement.setAttribute('data-mantine-color-scheme', 'dark'));
    await delay(600);
    await p3.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dark_01_login.png'), fullPage: false });

    // Login
    await loginAsAdmin(p3);
    await p3.evaluate(() => document.documentElement.setAttribute('data-mantine-color-scheme', 'dark'));
    await delay(800);

    // 3.2 Dark Dashboard
    console.log('3.2 Desktop Dark Dashboard');
    await p3.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dark_02_dashboard.png'), fullPage: true });

    // 3.3 Dark Transactions
    console.log('3.3 Desktop Dark Transactions');
    await navigateTo(p3, 'Transactions', false);
    await p3.waitForFunction(() => document.body.innerText.includes('Add Transaction'), { timeout: 10000 });
    await delay(1000);
    await p3.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dark_03_transactions.png'), fullPage: true });

    // 3.4 Dark Analytics
    console.log('3.4 Dark Analytics');
    await navigateTo(p3, 'Analytics', false);
    await p3.waitForFunction(() => document.body.innerText.includes('Expense Category Breakdown'), { timeout: 10000 });
    await delay(2000);
    await p3.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dark_04_analytics.png'), fullPage: true });

    // 3.5 Dark Family
    console.log('3.5 Dark Family');
    await navigateTo(p3, 'Family', false);
    await p3.waitForFunction(() => document.body.innerText.includes('Family Management'), { timeout: 10000 });
    await delay(1000);
    await p3.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_dark_05_family.png'), fullPage: true });
    await p3.close();

    // ==========================================
    // 4. MOBILE DARK MODE (390x844)
    // ==========================================
    console.log('\n--- 4. MOBILE DARK (390x844) ---');
    const p4 = await browser.newPage();
    await p4.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p4.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    await ensureLoggedOut(p4);
    await loginAsAdmin(p4);
    await p4.evaluate(() => document.documentElement.setAttribute('data-mantine-color-scheme', 'dark'));
    await delay(800);

    // 4.1 Mobile Dark Dashboard
    console.log('4.1 Mobile Dark Dashboard');
    await p4.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dark_01_dashboard.png'), fullPage: true });

    // 4.2 Mobile Dark Nav Drawer
    console.log('4.2 Mobile Dark Nav Drawer');
    await p4.evaluate(() => {
      const b = document.querySelector('button.mantine-Burger-root');
      if (b) b.click();
    });
    await delay(700);
    await p4.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dark_02_nav_drawer.png'), fullPage: false });
    await p4.evaluate(() => {
      const b = document.querySelector('button.mantine-Burger-root');
      if (b) b.click();
    });
    await delay(500);

    // 4.3 Mobile Dark Transactions Cards
    console.log('4.3 Mobile Dark Transactions');
    await navigateTo(p4, 'Transactions', true);
    await p4.waitForFunction(() => document.body.innerText.includes('Add Transaction'), { timeout: 10000 });
    await delay(1000);
    await p4.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dark_03_transactions.png'), fullPage: true });

    // 4.4 Mobile Dark Analytics
    console.log('4.4 Mobile Dark Analytics');
    await navigateTo(p4, 'Analytics', true);
    await p4.waitForFunction(() => document.body.innerText.includes('Expense Category Breakdown'), { timeout: 10000 });
    await delay(2000);
    await p4.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dark_04_analytics.png'), fullPage: true });

    // 4.5 Mobile Dark Family
    console.log('4.5 Mobile Dark Family');
    await navigateTo(p4, 'Family', true);
    await p4.waitForFunction(() => document.body.innerText.includes('Family Management'), { timeout: 10000 });
    await delay(1000);
    await p4.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_dark_05_family.png'), fullPage: true });
    await p4.close();

    console.log('\n=== ALL SCREENSHOTS SUCCESSFULLY CAPTURED ===\n');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Fatal error during capture:', err);
  process.exit(1);
});
