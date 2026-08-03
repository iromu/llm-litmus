const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(msg.text());
  });

  console.log('Navigating...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  console.log('Page loaded, waiting for game init...');

  // Wait for the game to initialize
  await new Promise(r => setTimeout(r, 5000));

  // Debug: check what's on the page
  const debugInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const blocker = document.getElementById('blocker');
    const game = window.__game;
    return {
      canvasExists: !!canvas,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      blockerExists: !!blocker,
      blockerDisplay: blocker ? window.getComputedStyle(blocker).display : 'N/A',
      gameExists: !!game,
      gameRenderer: game ? !!game.renderer : false,
      gameScene: game ? !!game.scene : false,
      gameCamera: game ? !!game.camera : false,
      gameStarted: game ? !!game.loop : false,
      bodyChildren: document.body.children.length,
      bodyStyle: document.body.style.cssText.substring(0, 200),
    };
  });
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

  // Inject JS to bypass blocker, resize canvas, boost everything
  console.log('Bypassing and boosting...');
  await page.evaluate(() => {
    // Hide blocker
    const blocker = document.getElementById('blocker');
    if (blocker) blocker.style.display = 'none';
    document.querySelectorAll('div').forEach(el => {
      const s = window.getComputedStyle(el);
      if (s.zIndex === '100' || s.zIndex === '999' || s.zIndex === '1000') {
        el.style.display = 'none';
      }
    });

    // Resize canvas — must set BOTH buffer size AND CSS client size
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.style.width = '1920px';
      canvas.style.height = '1080px';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      // Force clientWidth/clientHeight (some browsers don't update them from style)
      Object.defineProperty(canvas, 'clientWidth', { get: () => 1920, configurable: true });
      Object.defineProperty(canvas, 'clientHeight', { get: () => 1080, configurable: true });
    }
    window.dispatchEvent(new Event('resize'));

    // Boost renderer exposure
    const game = window.__game;
    if (game) {
      console.log('Found game instance');
      if (game.renderer) {
        game.renderer.toneMappingExposure = 5.0;
        console.log('Boosted renderer exposure to 5.0');
      }
      if (game.scene) {
        game.scene.background = null;
        game.scene.fog = null;
        console.log('Set scene background to null and removed fog');
      }
    } else {
      console.log('No game instance found');
    }
  });

  // Wait for scene to render
  await new Promise(r => setTimeout(r, 5000));

  // Check debug again
  const debugInfo2 = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const game = window.__game;
    return {
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      gameRenderer: game ? !!game.renderer : false,
      gameScene: game ? !!game.scene : false,
      exposure: game && game.renderer ? game.renderer.toneMappingExposure : 0,
      bgColor: game && game.scene ? game.scene.background?.getHexString?.() : 'none',
    };
  });
  console.log('Debug info 2:', JSON.stringify(debugInfo2, null, 2));

  console.log('Console messages:', consoleMessages.slice(-10));

  // Screenshot
  const outputPath = path.join(__dirname, 'screenshot-terrain-v2.png');
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
