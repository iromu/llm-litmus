const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));

  console.log('Navigating to http://127.0.0.1:5188/');
  await page.goto('http://127.0.0.1:5188/', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });

  console.log('Page loaded, hiding blocker');
  // Hide blocker overlay immediately
  await page.evaluate(() => {
    const divs = document.querySelectorAll('div');
    divs.forEach(d => {
      try {
        const s = window.getComputedStyle(d);
        if (s.position === 'fixed') d.style.display = 'none';
      } catch(e) {}
    });
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.style.display = 'block';
      canvas.style.visibility = 'visible';
    }
  });

  // Wait for canvas to appear
  console.log('Waiting for canvas...');
  try {
    await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 });
    console.log('Canvas found');
  } catch(e) {
    console.log('Canvas selector wait failed, trying alternate approach');
  }

  // Wait for WebGL context
  await new Promise(r => setTimeout(r, 5000));

  // Check if canvas exists
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas element' };
    return {
      exists: true,
      width: canvas.width,
      height: canvas.height,
      display: canvas.style.display,
      visible: canvas.style.visibility,
    };
  });
  console.log('Canvas info:', JSON.stringify(canvasInfo));

  // Take screenshot
  const outDir = 'artifacts/terrain-capture';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    await page.screenshot({ path: path.join(outDir, '01-start.png'), fullPage: false });
    console.log('Screenshot saved to', path.join(outDir, '01-start.png'));
  } catch(e) {
    console.error('Screenshot failed:', e.message);
  }

  await browser.close();
  if (errors.length > 0) console.error('Errors:', errors);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
