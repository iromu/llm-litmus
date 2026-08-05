/**
 * Minimal canvas test: draw known colors and verify pixel output
 */
import puppeteer from 'puppeteer';
import fs from 'fs';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    // Create a minimal HTML page with canvas
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; }
          body { background: #000; }
          canvas { image-rendering: pixelated; }
        </style>
      </head>
      <body>
        <canvas id="test" width="320" height="224"></canvas>
        <script>
          const canvas = document.getElementById('test');
          const ctx = canvas.getContext('2d', { alpha: false });
          ctx.imageSmoothingEnabled = false;

          // Clear to black
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, 320, 224);

          // Draw colored rectangles
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(0, 0, 80, 56);
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(80, 0, 80, 56);
          ctx.fillStyle = '#0000ff';
          ctx.fillRect(160, 0, 80, 56);
          ctx.fillStyle = '#ffff00';
          ctx.fillRect(240, 0, 80, 56);

          ctx.fillStyle = '#441100';
          ctx.fillRect(0, 56, 80, 56);
          ctx.fillStyle = '#773311';
          ctx.fillRect(80, 56, 80, 56);
          ctx.fillStyle = '#aa5533';
          ctx.fillRect(160, 56, 80, 56);
          ctx.fillStyle = '#cc6644';
          ctx.fillRect(240, 56, 80, 56);

          ctx.fillStyle = '#ff4400';
          ctx.fillRect(0, 112, 80, 56);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(80, 112, 80, 56);
          ctx.fillStyle = '#888888';
          ctx.fillRect(160, 112, 80, 56);
          ctx.fillStyle = '#442211';
          ctx.fillRect(240, 112, 80, 56);

          // Vignette effect
          const gradient = ctx.createRadialGradient(
            160, 112, 96,
            160, 112, 224
          );
          gradient.addColorStop(0, 'rgba(0,0,0,0)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 320, 224);

          // Scanlines
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          for (let y = 0; y < 224; y += 2) {
            ctx.fillRect(0, y, 320, 1);
          }
        </script>
      </body>
      </html>
    `);

    await new Promise(r => setTimeout(r, 500));

    // Take screenshot
    await page.screenshot({ path: 'test-output/color-test.png' });

    // Read pixels
    const result = await page.evaluate(() => {
      const canvas = document.getElementById('test');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      const samples = [
        { x: 40, y: 28, label: 'red' },
        { x: 120, y: 28, label: 'green' },
        { x: 200, y: 28, label: 'blue' },
        { x: 280, y: 28, label: 'yellow' },
        { x: 40, y: 84, label: 'volcanic sky (#441100)' },
        { x: 120, y: 84, label: 'volcanic mountain (#773311)' },
        { x: 200, y: 84, label: 'volcanic canyon (#aa5533)' },
        { x: 280, y: 84, label: 'volcanic rock (#cc6644)' },
        { x: 40, y: 140, label: 'lava (#ff4400)' },
        { x: 120, y: 140, label: 'white (#ffffff)' },
        { x: 200, y: 140, label: 'gray (#888888)' },
        { x: 280, y: 140, label: 'dark brown (#442211)' },
        { x: 160, y: 168, label: 'bottom center (dark area)' },
        { x: 0, y: 0, label: 'top-left corner' },
        { x: 319, y: 223, label: 'bottom-right corner' },
      ];

      const pixelSamples = samples.map(s => {
        const i = (s.y * 320 + s.x) * 4;
        return {
          ...s,
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          hex: `#${data[i].toString(16).padStart(2,'0')}${data[i+1].toString(16).padStart(2,'0')}${data[i+2].toString(16).padStart(2,'0')}`
        };
      });

      // Count dark/light pixels
      let dark = 0, light = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
        if (brightness < 32) dark++;
        if (brightness > 200) light++;
      }

      return {
        pixelSamples,
        darkPct: ((dark / (320 * 224)) * 100).toFixed(1),
        lightPct: ((light / (320 * 224)) * 100).toFixed(1),
      };
    });

    console.log('=== Color Test ===\n');
    console.log(`Dark pixels: ${result.darkPct}%`);
    console.log(`Light pixels: ${result.lightPct}%`);
    console.log('\n--- Pixel samples ---');
    result.pixelSamples.forEach(s => {
      console.log(`  ${s.label}: ${s.hex} (${s.r},${s.g},${s.b})`);
    });

    console.log('\nScreenshot saved to test-output/color-test.png');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
