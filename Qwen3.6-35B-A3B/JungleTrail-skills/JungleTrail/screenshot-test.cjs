const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--use-gl=swiftshader',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Collect all logs
  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`PAGE_ERROR: ${err.message}`));

  // Track page lifecycle
  let pageCrashed = false;
  page.on('close', () => { pageCrashed = true; console.log('Page closed unexpectedly'); });

  console.log('Loading page...');
  try {
    await page.goto('http://127.0.0.1:5173/', {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });
  } catch (e) {
    console.log('Page load error (may be ok):', e.message);
  }

  if (pageCrashed) {
    console.error('Page crashed during load');
    await browser.close();
    process.exit(1);
  }

  console.log('Page loaded.');
  console.log('Waiting 5s for game init...');
  await new Promise(r => setTimeout(r, 5000));

  if (pageCrashed) {
    console.error('Page crashed during init');
    await browser.close();
    process.exit(1);
  }

  // Force resize
  console.log('Forcing resize...');
  try {
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  } catch(e) { console.log('Resize error:', e.message); }
  await new Promise(r => setTimeout(r, 1000));

  if (pageCrashed) {
    console.error('Page crashed during resize');
    await browser.close();
    process.exit(1);
  }

  // Check state
  let state;
  try {
    state = await page.evaluate(() => {
      if (!window.__game) return { error: 'no game' };
      const r = window.__game.renderer;
      return {
        canvasW: r.domElement.width,
        canvasH: r.domElement.height,
        exposure: r.toneMappingExposure,
        sceneChildren: window.__game.scene.children.length,
        sceneBg: window.__game.scene.background,
        isLocked: window.__game.controls.isLocked,
      };
    });
  } catch(e) {
    state = { error: `evaluate failed: ${e.message}` };
  }
  console.log('State:', JSON.stringify(state, null, 2));

  // Try to click the page to simulate user gesture for pointer lock
  console.log('Clicking page...');
  try {
    await page.mouse.click(960, 540);
  } catch(e) { console.log('Click error:', e.message); }
  await new Promise(r => setTimeout(r, 1000));

  if (pageCrashed) {
    console.error('Page crashed during click');
    await browser.close();
    process.exit(1);
  }

  // Take screenshot
  console.log('Taking screenshot...');
  const outputPath = '/tmp/jungle_white_bg.png';
  try {
    await page.screenshot({ path: outputPath, fullPage: false });
    console.log('Screenshot saved to', outputPath);
    const stats = fs.statSync(outputPath);
    console.log('Screenshot size:', stats.size, 'bytes');
  } catch(e) {
    console.log('Screenshot error:', e.message);
  }

  // Print logs
  if (logs.length > 0) {
    console.log(`\n${logs.length} console entries:`);
    logs.slice(-20).forEach(l => console.log('  ' + l));
  }

  await browser.close();
  console.log('Done.');
})().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
