// Review the actual chart pages, hover states and standalone SVG downloads.
const { chromium } = require('../frontend/node_modules/@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const output = path.resolve(__dirname, '../docs/screenshots/charts');
const hoverOnly = process.argv.includes('--hover-only');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge' });
  const results = [];
  const sizes = [['desktop',1440,1000],['tablet',1024,900],['mobile',390,844],['narrow-mobile',320,844],['compact-tablet',768,1024],['wide-desktop',1920,1080]].filter(([name]) => !hoverOnly || ['desktop','mobile'].includes(name));
  for (const [name,width,height] of sizes) {
    const page = await browser.newPage({viewport:{width,height}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const section of (hoverOnly ? [] : ['overview','revenue','products','customers'])) {
      await page.goto(`http://127.0.0.1:3000/${section}`);
      await page.waitForFunction(() => document.querySelector('.data-notice') && !document.querySelector('.loading-state') && !document.querySelector('.error-state'));
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => ({overflow: document.documentElement.scrollWidth > innerWidth, chartCount: document.querySelectorAll('.recharts-surface').length}));
      results.push({viewport:name,section,...layout});
      if(layout.overflow) throw new Error(`${name}/${section}: page overflow`);
      await page.screenshot({path:path.join(output,`${name}-${section}.png`),fullPage:true});
      if(section === 'overview') await page.screenshot({path:path.join(output,`${name}-overview-viewport.png`)});
      if(section === 'products') await page.locator('.two-columns').screenshot({path:path.join(output,`${name}-product-comparisons.png`), style:'.skip-link:not(:focus) { visibility: hidden; }'});
      if(section === 'customers') await page.locator('.segments-panel').screenshot({path:path.join(output,`${name}-segments.png`)});
    }
    if (['desktop','mobile'].includes(name)) {
      await page.goto('http://127.0.0.1:3000/overview');
      const trend = page.locator('.trend-panel[data-chart="revenue"]');
      await trend.getByRole('heading',{name:'Revenue trend'}).waitFor();
      await trend.scrollIntoViewIfNeeded();
      const chart = trend.locator('.chart-area');
      const box = await chart.boundingBox();
      await chart.hover({position:{x:box.width*.62,y:box.height*.42}});
      await page.getByRole('tooltip').waitFor();
      await page.screenshot({path:path.join(output,`${name}-revenue-hover.png`)});
      await page.mouse.move(0,0);
      const download = page.waitForEvent('download');
      await trend.getByRole('button',{name:'Download chart as SVG image'}).click();
      const svg = await fs.readFile(await (await download).path(),'utf8');
      await fs.writeFile(path.join(output,`${name}-revenue-export.svg`),svg);
      const preview = await browser.newPage({viewport:{width:width,height:650}});
      await preview.setContent(`<html><body style="margin:0"><img alt="Exported chart" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" /></body></html>`);
      await preview.getByRole('img').evaluate(image => image.decode());
      await preview.getByRole('img').screenshot({path:path.join(output,`${name}-svg-export.png`)});
      await preview.close();
      await trend.getByRole('button',{name:'Dismiss notification'}).click();
      await trend.getByRole('combobox',{name:'Measure',exact:true}).selectOption('returns');
      await trend.screenshot({path:path.join(output,`${name}-returns.png`)});
      const market = page.locator('.country-chart');
      await market.scrollIntoViewIfNeeded();
      await market.locator('.recharts-bar-rectangle').first().hover();
      await page.getByRole('tooltip').waitFor();
      await page.screenshot({path:path.join(output,`${name}-market-hover.png`)});
      await page.goto('http://127.0.0.1:3000/revenue');
      const volume = page.locator('.trend-panel[data-chart="volume"]');
      await volume.getByRole('heading',{name:'Order volume & basket value'}).waitFor();
      await volume.screenshot({path:path.join(output,`${name}-orders.png`)});
      await volume.getByRole('combobox',{name:'Measure',exact:true}).selectOption('aov');
      await volume.screenshot({path:path.join(output,`${name}-basket-value.png`)});
    }
    if(errors.length) throw new Error(errors.join('\n'));
    await page.close();
  }
  await browser.close();
  if(!hoverOnly) await fs.writeFile(path.join(output,'layout-report.json'),JSON.stringify(results,null,2));
  process.stdout.write(hoverOnly ? 'Refreshed hover, measure and standalone SVG captures with no browser errors.\n' : `Reviewed ${results.length} chart-page layouts; no page overflow or browser errors. Hover and exported SVG captures saved.\n`);
})().catch(error => {process.stderr.write(error.stack+'\n');process.exitCode=1});
