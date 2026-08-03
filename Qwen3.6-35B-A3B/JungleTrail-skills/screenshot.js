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
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.goto('http://127.0.0.1:5173/', {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for WebGL canvas to render
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas');
    return canvas && canvas.width > 0 && canvas.height > 0;
  }, { timeout: 15000 });

  // Wait a bit more for the scene to fully render
  await new Promise(r => setTimeout(r, 5000));

  // Screenshot
  const outputPath = path.join(__dirname, 'JungleTrail/screenshot-terrain-v2.png');
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
