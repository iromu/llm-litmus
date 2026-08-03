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
  });

  console.log('Navigating to http://127.0.0.1:5188/ ...');
  await page.goto('http://127.0.0.1:5188/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  console.log('Waiting for game to initialize...');
  await new Promise(r => setTimeout(r, 10000));

  // Take screenshots at multiple positions with maximum visibility
  const positions = [
    { pos: [0, 3, -5], rot: [0, 0, 0], label: 'start-high' },
    { pos: [3, 2.5, -20], rot: [0, 0.1, 0], label: 'canopy-mid' },
    { pos: [5, 2, -45], rot: [0, -0.05, 0], label: 'medium-canopy' },
    { pos: [3, 2, -75], rot: [0, 0.05, 0], label: 'opening' },
    { pos: [6, 2.5, -100], rot: [0, 0.1, 0], label: 'ruins-clearing' },
  ];

  for (const { pos, rot, label } of positions) {
    console.log(`Capturing ${label} at pos=${pos}, rot=${rot}...`);
    
    await page.evaluate(({ p, r }) => {
      const game = window.__game;
      if (game) {
        if (game.camera) {
          game.camera.position.set(...p);
          game.camera.rotation.set(...r);
        }
        if (game.scene) game.scene.fog = null;
        if (game.renderer) game.renderer.toneMappingExposure = 5.0;
      }
    }, { p: pos, r: rot });

    await new Promise(r => setTimeout(r, 2000));

    const outDir = 'artifacts/terrain-capture';
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    await page.screenshot({
      path: path.join(outDir, `${label}.png`),
      fullPage: false,
    });
    console.log(`  Saved ${label}.png`);
  }

  // Analyze all screenshots
  console.log('\n=== Analysis ===');
  const analysis = await page.evaluate(() => {
    const game = window.__game;
    if (!game) return 'no game';
    return {
      exposure: game.renderer?.toneMappingExposure,
      camPos: game.camera?.position?.toArray(),
      camRot: game.camera?.rotation?.toArray(),
      sceneChildren: game.scene?.children?.length,
      hasFog: !!game.scene?.fog,
    };
  });
  console.log('Final state:', JSON.stringify(analysis, null, 2));

  await browser.close();
  if (errors.length > 0) console.error('Errors:', errors.slice(0, 10));
  console.log('Done!');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
