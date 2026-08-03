const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--disable-gpu', '--disable-gpu-compositing', '--enable-unsafe-swiftshader',
           '--no-sandbox', '--disable-dev-shm-usage', '--disable-setuid-sandbox',
           '--use-gl=swiftshader', '--disable-gpu-process'],
    dumpio: false,
  });

  async function testGame(name, envVars) {
    console.log(`\n=== ${name} ===`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    let crashed = false;
    page.on('close', () => { crashed = true; });

    await page.evaluateOnNewDocument(() => {
      window.__errors = [];
      window.addEventListener('error', (e) => { window.__errors.push(`JS: ${e.message}`); });
      window.addEventListener('pageerror', (e) => { window.__errors.push(`PAGE: ${e.message}`); });
    });

    for (const [key, value] of Object.entries(envVars)) {
      await page.evaluateOnNewDocument((k, v) => { window[k] = v; }, key, value);
    }

    try {
      await page.goto('http://127.0.0.1:5173/', {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
    } catch (e) {
      console.log(`  Load failed: ${e.message}`);
      await page.close();
      return false;
    }

    await new Promise(r => setTimeout(r, 3000));

    if (crashed) {
      console.log('  CRASHED during init');
      await page.close();
      return false;
    }

    try {
      const state = await page.evaluate(() => ({
        hasGame: !!window.__game,
        sceneChildren: window.__game?.scene?.children?.length,
        canvasW: window.__game?.renderer?.domElement?.width,
        canvasH: window.__game?.renderer?.domElement?.height,
        errors: window.__errors || [],
      }));

      let screenshotPath = null;
      try {
        screenshotPath = `/tmp/jungle_${name.replace(/[^a-z]/g, '_')}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (e) {
        console.log(`  Screenshot failed: ${e.message}`);
      }

      const errSummary = state.errors.length > 0 
        ? `${state.errors.length} errors: ${state.errors.slice(0, 2).join('; ')}` 
        : 'none';
      
      console.log(`  OK - game: ${state.hasGame}, children: ${state.sceneChildren}, canvas: ${state.canvasW}x${state.canvasH}, errors: ${errSummary}, screenshot: ${screenshotPath ? fs.statSync(screenshotPath).size + ' bytes' : 'N/A'}`);
      await page.close();
      return true;
    } catch (e) {
      console.log(`  State check failed: ${e.message}`);
      await page.close();
      return false;
    }
  }

  // Test combinations that build up to full game
  await testGame('terrain+veg', { __TEST_TERRAIN: true, __TEST_VEGETATION: true, __DISABLE_POST_PROCESSING: true });
  await testGame('terrain+veg+light', { __TEST_TERRAIN: true, __TEST_VEGETATION: true, __TEST_LIGHTING: true, __DISABLE_POST_PROCESSING: true });
  await testGame('terrain+veg+light+atm', { __TEST_TERRAIN: true, __TEST_VEGETATION: true, __TEST_LIGHTING: true, __TEST_ATMOSPHERE: true, __DISABLE_POST_PROCESSING: true });
  await testGame('terrain+veg+light+atm+ruins', { __TEST_TERRAIN: true, __TEST_VEGETATION: true, __TEST_LIGHTING: true, __TEST_ATMOSPHERE: true, __TEST_RUINS: true, __DISABLE_POST_PROCESSING: true });
  await testGame('terrain+veg+light+atm+ruins+water', { __TEST_TERRAIN: true, __TEST_VEGETATION: true, __TEST_LIGHTING: true, __TEST_ATMOSPHERE: true, __TEST_RUINS: true, __TEST_WATER: true, __DISABLE_POST_PROCESSING: true });
  await testGame('full_no_pp', { __FULL_GAME: true, __DISABLE_POST_PROCESSING: true });

  await browser.close();
  console.log('\nDone.');
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
