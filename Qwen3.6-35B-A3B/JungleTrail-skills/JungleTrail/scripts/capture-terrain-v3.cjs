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
  page.on('console', msg => { 
    if (msg.type() === 'error') errors.push(msg.text());
    else if (msg.type() === 'log') console.log(`LOG: ${msg.text()}`);
  });
  page.on('pageerror', e => errors.push(e.message));

  console.log('Navigating to http://127.0.0.1:5188/ ...');
  await page.goto('http://127.0.0.1:5188/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // Wait for game to initialize and scene to render
  console.log('Waiting for game to initialize...');
  await new Promise(r => setTimeout(r, 10000));

  // Inject JS to fix rendering issues and move camera
  console.log('Boosting scene visibility...');
  const debugInfo = await page.evaluate(() => {
    // Hide blocker overlay
    document.querySelectorAll('div').forEach(el => {
      try {
        const s = window.getComputedStyle(el);
        if (s.position === 'fixed' && s.zIndex === '100') {
          el.style.display = 'none';
        }
      } catch(e) {}
    });

    // Find the game instance
    let game = window.__game;
    
    if (game) {
      // Boost exposure massively
      if (game.renderer) {
        game.renderer.toneMappingExposure = 3.0;
        console.log('Set exposure to 3.0');
      }
      // Remove fog, set background color via hex (no THREE reference needed)
      if (game.scene) {
        game.scene.fog = null;
        // Use scene.background directly - set hex via the renderer's context
        // Since we can't reference THREE.Color, we'll use the renderer's tone mapping
        console.log('Removed fog');
      }
      // Move camera forward along path (negative Z direction)
      if (game.camera) {
        game.camera.position.set(2, 1.7, -30);
        game.camera.rotation.set(0, Math.PI * 0.1, 0);
        console.log('Moved camera to', game.camera.position.toArray());
      }
      return { gameFound: true, exposure: game.renderer?.toneMappingExposure };
    }

    return { gameFound: false, canvasExists: !!document.querySelector('canvas') };
  });
  console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

  // Wait for scene to re-render with new settings
  console.log('Waiting for scene to re-render...');
  await new Promise(r => setTimeout(r, 3000));

  // Take screenshot
  const outDir = 'artifacts/terrain-capture';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Taking screenshot...');
  await page.screenshot({
    path: path.join(outDir, '01-start.png'),
    fullPage: false,
  });
  console.log('Screenshot saved');

  // Analyze the screenshot
  await new Promise(r => setTimeout(r, 100));
  const analysis = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'no canvas' };
    
    // Resize canvas to full viewport
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.style.width = '1920px';
    canvas.style.height = '1080px';
    window.dispatchEvent(new Event('resize'));
    
    return {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
    };
  });
  console.log('Canvas analysis:', JSON.stringify(analysis, null, 2));

  // Wait for resize to take effect
  await new Promise(r => setTimeout(r, 2000));

  // Take second screenshot with proper canvas size
  console.log('Taking second screenshot with full resolution...');
  await page.screenshot({
    path: path.join(outDir, '02-fullres.png'),
    fullPage: false,
  });

  // Try moving camera further along the path
  console.log('Moving camera further along path...');
  await page.evaluate(() => {
    const game = window.__game;
    if (game && game.camera) {
      game.camera.position.set(5, 1.7, -60);
      game.camera.rotation.set(0, 0, 0);
      if (game.scene) game.scene.fog = null;
      if (game.renderer) game.renderer.toneMappingExposure = 3.0;
      console.log('Moved camera to', game.camera.position.toArray());
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Taking third screenshot (mid-path)...');
  await page.screenshot({
    path: path.join(outDir, '03-midpath.png'),
    fullPage: false,
  });

  // Move camera even further
  console.log('Moving camera to ruins area...');
  await page.evaluate(() => {
    const game = window.__game;
    if (game && game.camera) {
      game.camera.position.set(8, 1.7, -90);
      game.camera.rotation.set(0, 0.05, 0);
      if (game.scene) game.scene.fog = null;
      if (game.renderer) game.renderer.toneMappingExposure = 3.0;
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Taking fourth screenshot (ruins area)...');
  await page.screenshot({
    path: path.join(outDir, '04-ruins.png'),
    fullPage: false,
  });

  await browser.close();
  if (errors.length > 0) console.error('Errors:', errors.slice(0, 20));
  console.log('Done!');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
