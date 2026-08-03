const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('Loading page...');
  await page.goto('http://127.0.0.1:5188/', {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  });
  console.log('Page loaded.');

  // Wait for WebGL canvas to render
  console.log('Waiting for canvas...');
  const canvasFound = await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 10000 }).catch(() => null);
  
  if (!canvasFound) {
    console.error('No canvas found, trying screenshot anyway...');
  } else {
    console.log('Canvas found.');
  }

  // Shorter wait - just 3 seconds for the scene to render
  console.log('Waiting 3s for scene render...');
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot
  const outputPath = path.join(__dirname, 'JungleTrail/screenshot-canyon-v3.png');
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);

  await browser.close();
  console.log('Done.');
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
