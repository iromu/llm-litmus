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
      '--disable-gpu',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', e => errors.push(e.message));

  console.log('Navigating to http://127.0.0.1:5188/ ...');
  await page.goto('http://127.0.0.1:5188/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Wait for game to initialize
  console.log('Waiting for game to initialize...');
  await new Promise(r => setTimeout(r, 8000));

  // Inject JS to bypass blocker and move camera along the path
  console.log('Bypassing blocker and moving camera...');
  const result = await page.evaluate(() => {
    // Hide any blocker overlays
    document.querySelectorAll('div').forEach(el => {
      try {
        const s = window.getComputedStyle(el);
        if (s.position === 'fixed' && s.zIndex === '100') {
          el.style.display = 'none';
        }
      } catch(e) {}
    });

    // Access the game instance
    // The Game class stores its instance via the module system
    // We'll try to find it via the canvas element
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };

    // Try to access game via common patterns
    // In Vite dev mode, modules are loaded as ES modules
    // We need to find the game instance
    let game = null;
    
    // Check if game is exposed on window
    if (window.__game) {
      game = window.__game;
    }
    
    // Try to find game via canvas parent
    if (!game && canvas.parentElement) {
      // The game instance isn't directly accessible from injected JS
      // We'll use a different approach: directly manipulate the scene
      game = null;
    }

    return {
      canvasExists: !!canvas,
      canvasWidth: canvas ? canvas.width : 0,
      canvasHeight: canvas ? canvas.height : 0,
      gameFound: !!game,
    };
  });
  console.log('Game detection:', JSON.stringify(result, null, 2));

  // Wait for scene to fully render
  console.log('Waiting for scene to render (5s)...');
  await new Promise(r => setTimeout(r, 5000));

  // Take screenshot
  const outDir = 'artifacts/terrain-capture';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Taking screenshot...');
  await page.screenshot({
    path: path.join(outDir, '01-start.png'),
    fullPage: false,
  });
  console.log('Screenshot saved to', path.join(outDir, '01-start.png'));

  await browser.close();
  if (errors.length > 0) console.error('Errors:', errors);
  console.log('Done!');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
