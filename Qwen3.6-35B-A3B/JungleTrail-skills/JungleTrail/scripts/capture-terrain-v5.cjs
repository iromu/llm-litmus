const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => { 
    if (msg.type() === 'error') console.log(`ERR: ${msg.text()}`);
  });

  console.log('Navigating...');
  await page.goto('http://127.0.0.1:5188/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log('Waiting for game init...');
  await new Promise(r => setTimeout(r, 10000));

  // First: sample terrain heights along the path by asking the game to log them
  console.log('Sampling terrain heights...');
  const heights = await page.evaluate(() => {
    const game = window.__game;
    if (!game || !game.terrain) return 'no terrain';
    
    // Sample heights at various Z positions along the path
    const samples = [];
    for (let z = 0; z >= -125; z -= 10) {
      // Get terrain height at path center and at edges
      const terrain = game.terrain;
      // We can't directly call getHeightAt (it's private), but we can check camera position
      // Let's just return what we can access
      samples.push({ z, pathX: 0 });
    }
    return { message: 'terrain exists', children: game.scene?.children?.length };
  });
  console.log('Terrain info:', JSON.stringify(heights, null, 2));

  // Take screenshots at higher camera positions to avoid being inside terrain
  const positions = [
    // Start area - should be relatively flat
    { pos: [0, 4, -5], rot: [0, 0, 0], label: 'start-y4' },
    { pos: [2, 5, -15], rot: [0, 0.05, 0], label: 'canopy-y5' },
    { pos: [3, 6, -30], rot: [0, -0.05, 0], label: 'mid-y6' },
    { pos: [4, 8, -50], rot: [0, 0.05, 0], label: 'deep-mid-y8' },
    { pos: [3, 10, -70], rot: [0, -0.05, 0], label: 'opening-y10' },
    { pos: [5, 8, -90], rot: [0, 0.1, 0], label: 'ruins-y8' },
    { pos: [8, 6, -110], rot: [0, 0.15, 0], label: 'falls-y6' },
  ];

  for (const { pos, rot, label } of positions) {
    console.log(`Capturing ${label}...`);
    
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

  await browser.close();
  console.log('Done!');
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
