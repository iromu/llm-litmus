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

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.evaluateOnNewDocument(() => {
    window.__errors = [];
    window.addEventListener('error', (e) => { window.__errors.push(`JS: ${e.message}`); });
    window.addEventListener('pageerror', (e) => { window.__errors.push(`PAGE: ${e.message}`); });
  });

  console.log('\n=== full game with post-processing ===');
  try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  } catch (e) {
    console.log(`  Load failed: ${e.message}`);
    await browser.close();
    return;
  }

  await new Promise(r => setTimeout(r, 5000));

  try {
    const state = await page.evaluate(() => ({
      hasGame: !!window.__game,
      sceneChildren: window.__game?.scene?.children?.length,
      canvasW: window.__game?.renderer?.domElement?.width,
      canvasH: window.__game?.renderer?.domElement?.height,
      ppEnabled: window.__game?.usePostProcessing,
      errors: window.__errors || [],
    }));

    // Sample pixels via 2D canvas overlay
    const pixels = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const w = canvas.width;
      const h = canvas.height;
      // Create 2D context to read pixels
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx2d = offscreen.getContext('2d');
      ctx2d.drawImage(canvas, 0, 0);
      const imgData = ctx2d.getImageData(w/2 - 5, h/2 - 5, 10, 10);
      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < imgData.data.length; i += 4) {
        rSum += imgData.data[i];
        gSum += imgData.data[i + 1];
        bSum += imgData.data[i + 2];
      }
      return {
        avgR: Math.round(rSum / 100),
        avgG: Math.round(gSum / 100),
        avgB: Math.round(bSum / 100),
      };
    });

    let screenshotPath = '/tmp/jungle_full_pp.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const size = fs.statSync(screenshotPath).size;

    const errSummary = state.errors.length > 0 
      ? `${state.errors.length} errors: ${state.errors.slice(0, 2).join('; ')}` 
      : 'none';
    
    console.log(`  OK - game: ${state.hasGame}, children: ${state.sceneChildren}, canvas: ${state.canvasW}x${state.canvasH}, pp: ${state.ppEnabled}, errors: ${errSummary}`);
    if (pixels) {
      console.log(`  Pixels (center 10x10): avg R=${pixels.avgR} G=${pixels.avgG} B=${pixels.avgB} (${pixels.avgR < 10 && pixels.avgG < 10 && pixels.avgB < 10 ? 'BLACK' : 'VISIBLE'})`);
    }
    console.log(`  Screenshot: ${screenshotPath} (${size} bytes)`);
    await page.close();
  } catch (e) {
    console.log(`  State check failed: ${e.message}`);
    await page.close();
  }

  await browser.close();
  console.log('\nDone.');
})().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
