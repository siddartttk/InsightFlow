// Capture UI feedback using controlled failures and actual demo data.
const { chromium } = require('../frontend/node_modules/@playwright/test');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge' });
  const output = path.resolve(__dirname, '../docs/screenshots/audit');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route('**/api/meta', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });
    await page.goto('http://127.0.0.1:3000/overview');
    await page.getByRole('status', { name: 'Loading analytics' }).waitFor();
    await page.locator('.loading-state').screenshot({ path: path.join(output, `${name}-loading.png`) });
    await page.getByRole('heading', { name: 'Revenue trend' }).waitFor();
    await page.unroute('**/api/meta');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export summary' }).click();
    await download;
    await page.locator('.status-success').screenshot({ path: path.join(output, `${name}-export-success.png`) });
    await page.getByRole('button', { name: 'Dismiss notification' }).click();
    await page.route('**/api/dashboard?**', route => route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({detail: 'The data service is temporarily unavailable. Please try again.'})}));
    await page.getByRole('button', {name: 'Last 30 days', exact: true}).click();
    await page.locator('.feedback-state.error-state').screenshot({path: path.join(output, `${name}-error.png`)});
    await page.unroute('**/api/dashboard?**');
    await page.getByRole('button', {name: 'Try again', exact: true}).click();
    await page.getByRole('heading', { name: 'Revenue trend' }).waitFor();
    await page.getByLabel('From date').fill('2025-01-01');
    await page.getByLabel('To date').fill('2025-01-02');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.locator('.feedback-state.empty-state').screenshot({path: path.join(output, `${name}-empty.png`)});
    await page.close();
  }
  await browser.close();
  process.stdout.write('Captured loading, download success, API error and empty selection at desktop and mobile sizes.\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
