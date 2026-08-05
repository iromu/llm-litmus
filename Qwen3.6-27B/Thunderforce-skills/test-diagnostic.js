/**
 * Diagnostic script: capture raw canvas pixels and analyze what's rendering
 */
import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle0', timeout: 10000 });
    
    // Wait for game to initialize
    await new Promise(r => setTimeout(r, 2000));

    // Capture raw pixel data
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Sample specific coordinates
      const samples = [
        { x: 0, y: 0, label: 'top-left corner' },
        { x: 319, y: 0, label: 'top-right corner' },
        { x: 0, y: 223, label: 'bottom-left corner' },
        { x: 319, y: 223, label: 'bottom-right corner' },
        { x: 160, y: 112, label: 'center' },
        { x: 160, y: 60, label: 'upper center (title area)' },
        { x: 160, y: 140, label: 'lower center (press start area)' },
        { x: 100, y: 50, label: 'title text area' },
        { x: 200, y: 50, label: 'title text area right' },
      ];

      const pixelSamples = samples.map(s => {
        const i = (s.y * 320 + s.x) * 4;
        return {
          ...s,
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          a: data[i + 3],
          hex: `#${data[i].toString(16).padStart(2,'0')}${data[i+1].toString(16).padStart(2,'0')}${data[i+2].toString(16).padStart(2,'0')}`
        };
      });

      // Count color distribution
      const colorMap = new Map();
      let darkCount = 0;
      let lightCount = 0;
      let totalPixels = 320 * 224;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const key = `${r},${g},${b}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);

        const brightness = (r + g + b) / 3;
        if (brightness < 32) darkCount++;
        if (brightness > 200) lightCount++;
      }

      // Top 10 most common colors
      const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const topColors = sorted.map(([color, count]) => {
        const [r, g, b] = color.split(',').map(Number);
        return {
          hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`,
          rgb: [r, g, b],
          count,
          pct: ((count / totalPixels) * 100).toFixed(1)
        };
      });

      // Check for expected content
      const hasBlack = topColors.some(c => c.rgb[0] < 10 && c.rgb[1] < 10 && c.rgb[2] < 10);
      const hasWhite = topColors.some(c => c.rgb[0] > 200 && c.rgb[1] > 200 && c.rgb[2] > 200);
      const uniqueColors = colorMap.size;

      // Check game state
      const game = canvas._game;
      const gameState = game ? game.getState() : 'no game';
      const stateNames = ['TITLE', 'INTRO', 'PLAYING', 'BOSS', 'GAME_OVER', 'HIGH_SCORE'];

      return {
        pixelSamples,
        topColors,
        uniqueColors,
        darkPixels: darkCount,
        lightPixels: lightCount,
        darkPct: ((darkCount / totalPixels) * 100).toFixed(1),
        lightPct: ((lightCount / totalPixels) * 100).toFixed(1),
        hasBlack,
        hasWhite,
        gameState: stateNames[gameState] || `unknown(${gameState})`,
      };
    });

    console.log('=== Canvas Diagnostic ===\n');
    console.log(`Game state: ${result.gameState}`);
    console.log(`Unique colors: ${result.uniqueColors}`);
    console.log(`Dark pixels (<32): ${result.darkPct}%`);
    console.log(`Light pixels (>200): ${result.lightPct}%`);
    console.log(`Has black: ${result.hasBlack}`);
    console.log(`Has white: ${result.hasWhite}`);

    console.log('\n--- Top 10 colors ---');
    result.topColors.forEach(c => {
      console.log(`  ${c.hex} (${c.rgb.join(',')}) - ${c.pct}% (${c.count} pixels)`);
    });

    console.log('\n--- Pixel samples ---');
    result.pixelSamples.forEach(s => {
      console.log(`  ${s.label}: ${s.hex} (${s.r},${s.g},${s.b}), alpha=${s.a}`);
    });

    // Take a screenshot for visual inspection
    await page.screenshot({ path: 'test-output/diagnostic.png', fullPage: false });
    console.log('\nScreenshot saved to test-output/diagnostic.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
