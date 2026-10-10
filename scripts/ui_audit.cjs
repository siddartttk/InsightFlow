// Render actual application routes at representative sizes and detect page overflow.
const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const edges = process.argv.includes('--edges');
const routes = process.argv.slice(2).filter(arg => arg !== '--edges');
const sections = routes.length ? routes : ['overview', 'revenue', 'products', 'customers', 'insights', 'import', 'reports', 'about', 'privacy', 'terms'];
const output = path.resolve(__dirname, '../docs/screenshots/audit');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const results = [];
  const viewports = edges ? [['narrow-mobile', 320, 844], ['compact-tablet', 768, 1024], ['wide-desktop', 1920, 1080]] : [['desktop', 1440, 1000], ['tablet', 1024, 900], ['mobile', 390, 844]];
  for (const [name, width, height] of viewports) {
    const page = await browser.newPage({ viewport: { width, height } });
    for (const section of sections) {
      await page.goto(`http://127.0.0.1:3000/${section}`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      if (!['privacy', 'terms'].includes(section)) {
        await page.waitForFunction(() => document.querySelector('.data-notice') && !document.querySelector('.loading-state'));
      }
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        metricOverflow: [...document.querySelectorAll('.metric-value')].filter(el => el.getBoundingClientRect().width > el.parentElement.clientWidth + 1).length,
        chartCount: document.querySelectorAll('.recharts-surface').length,
      }));
      await page.screenshot({ path: path.join(output, `${name}-${section}.png`), fullPage: true });
      if (section === 'overview') await page.screenshot({ path: path.join(output, `${name}-overview-viewport.png`) });
      results.push({ viewport: name, section, ...metrics });
    }
    await page.close();
  }
  await browser.close();
  await fs.writeFile(path.join(output, edges ? 'edge-layout-report.json' : 'layout-report.json'), JSON.stringify(results, null, 2));
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
})().catch(error => { process.stderr.write(error.message + '\n'); process.exitCode = 1; });
