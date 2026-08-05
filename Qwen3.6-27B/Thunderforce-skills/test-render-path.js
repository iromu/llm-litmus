/**
 * Test: render game title screen step by step and check each stage
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

    // Test 1: Force title state and render manually
    const result = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const game = canvas._game;

      // Helper to get center pixel
      function getCenter() {
        const data = ctx.getImageData(160, 112, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2], hex: `#${data[0].toString(16).padStart(2,'0')}${data[1].toString(16).padStart(2,'0')}${data[2].toString(16).padStart(2,'0')}` };
      }

      function getTopLeft() {
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2], hex: `#${data[0].toString(16).padStart(2,'0')}${data[1].toString(16).padStart(2,'0')}${data[2].toString(16).padStart(2,'0')}` };
      }

      const steps = [];

      // Step 1: Clear to black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 320, 224);
      steps.push({ step: 'clear black', center: getCenter(), topLeft: getTopLeft() });

      // Step 2: Draw a red rectangle (test)
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(100, 50, 120, 40);
      steps.push({ step: 'red rect', center: getCenter(), topLeft: getTopLeft() });

      // Step 3: Clear to black again
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 320, 224);
      steps.push({ step: 'clear black again', center: getCenter(), topLeft: getTopLeft() });

      // Step 4: Use game.clear()
      game.clear();
      steps.push({ step: 'game.clear()', center: getCenter(), topLeft: getTopLeft() });

      // Step 5: Use game.clear('#000000')
      game.clear('#000000');
      steps.push({ step: 'game.clear("#000000")', center: getCenter(), topLeft: getTopLeft() });

      // Step 6: Draw using game.render.rect
      game.render.rect(0, 0, 320, 224, '#000000');
      steps.push({ step: 'render.rect black', center: getCenter(), topLeft: getTopLeft() });

      // Step 7: Draw red using game.render.rect
      game.render.rect(100, 50, 120, 40, '#ff0000');
      const redCenter = getCenter();
      steps.push({ step: 'render.rect red', center: redCenter, topLeft: getTopLeft() });

      // Step 8: Draw volcanic sky using game.render.rect
      game.render.rect(0, 0, 320, 224, '#441100');
      steps.push({ step: 'render.rect volcanic sky', center: getCenter(), topLeft: getTopLeft() });

      // Step 9: Call game.renderFrame() - but first force TITLE state
      // Access private state
      game['setState'](0); // TITLE
      game['stageTransitionTimer'] = 0;
      game['stageTransitionAlpha'] = 0;
      game['flashAlpha'] = 0;

      // Now call renderFrame
      game['renderFrame']();
      steps.push({ step: 'game.renderFrame() TITLE', center: getCenter(), topLeft: getTopLeft() });

      // Step 10: Check ctx state
      const ctxState = {
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        globalAlpha: ctx.globalAlpha,
        globalCompositeOperation: ctx.globalCompositeOperation,
        imageSmoothingEnabled: ctx.imageSmoothingEnabled,
      };

      return { steps, ctxState };
    });

    console.log('=== Render Path Test ===\n');
    result.steps.forEach(s => {
      console.log(`${s.step}: center=${s.center.hex} (${s.center.r},${s.center.g},${s.center.b}), topLeft=${s.topLeft.hex}`);
    });

    console.log('\n--- Canvas context state ---');
    console.log(JSON.stringify(result.ctxState, null, 2));

    // Take screenshot
    await page.screenshot({ path: 'test-output/render-path.png' });
    console.log('\nScreenshot saved to test-output/render-path.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
