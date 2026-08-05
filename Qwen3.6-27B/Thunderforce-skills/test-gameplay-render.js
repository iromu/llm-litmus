/**
 * Test: render gameplay step by step and check each stage
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
    await new Promise(r => setTimeout(r, 1000));

    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const game = canvas._game;

      function getCenter() {
        const data = ctx.getImageData(160, 112, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2], hex: `#${data[0].toString(16).padStart(2,'0')}${data[1].toString(16).padStart(2,'0')}${data[2].toString(16).padStart(2,'0')}` };
      }

      function getStats() {
        const data = ctx.getImageData(0, 0, 320, 224).data;
        let dark = 0, light = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] + data[i+1] + data[i+2]) / 3;
          if (b < 32) dark++;
          if (b > 200) light++;
        }
        return {
          darkPct: ((dark / (320 * 224)) * 100).toFixed(1),
          lightPct: ((light / (320 * 224)) * 100).toFixed(1)
        };
      }

      const steps = [];

      // Force PLAYING state with clean setup
      game['setState'](2); // PLAYING
      game['stageTransitionTimer'] = 0;
      game['flashAlpha'] = 0;

      // Step 1: Clear and draw volcanic sky manually
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 320, 224);
      ctx.fillStyle = '#441100';
      ctx.fillRect(0, 0, 320, 224);
      steps.push({ step: 'manual volcanic sky', center: getCenter(), ...getStats() });

      // Step 2: Clear and call game.clear() + parallax render
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 320, 224);
      game.clear();
      game.parallax.render(game.render, game.camera);
      steps.push({ step: 'clear + parallax.render', center: getCenter(), ...getStats() });

      // Step 3: Full renderFrame in PLAYING state
      game['renderFrame']();
      steps.push({ step: 'renderFrame PLAYING', center: getCenter(), ...getStats() });

      // Step 4: Check ctx state after render
      const ctxState = {
        globalAlpha: ctx.globalAlpha,
        globalCompositeOperation: ctx.globalCompositeOperation,
      };

      // Step 5: Count unique colors
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const colorMap = new Map();
      for (let i = 0; i < imageData.data.length; i += 4) {
        const key = `${imageData.data[i]},${imageData.data[i+1]},${imageData.data[i+2]}`;
        colorMap.set(key, (colorMap.get(key) || 0) + 1);
      }

      // Top 5 colors
      const topColors = [...colorMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([color, count]) => {
          const [r, g, b] = color.split(',').map(Number);
          return { hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`, count };
        });

      return { steps, ctxState, uniqueColors: colorMap.size, topColors };
    });

    console.log('=== Gameplay Render Test ===\n');
    result.steps.forEach(s => {
      console.log(`${s.step}:`);
      console.log(`  center: ${s.center.hex} (${s.center.r},${s.center.g},${s.center.b})`);
      console.log(`  dark: ${s.darkPct}%, light: ${s.lightPct}%`);
    });

    console.log('\n--- Context state ---');
    console.log(JSON.stringify(result.ctxState));

    console.log('\n--- Color stats ---');
    console.log(`Unique colors: ${result.uniqueColors}`);
    console.log('Top 5 colors:');
    result.topColors.forEach(c => console.log(`  ${c.hex}: ${c.count} pixels`));

    await page.screenshot({ path: 'test-output/gameplay-render.png' });
    console.log('\nScreenshot saved to test-output/gameplay-render.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
