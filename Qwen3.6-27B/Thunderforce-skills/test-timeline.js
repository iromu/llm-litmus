/**
 * Test: let game run naturally and capture at different times
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

    const stateNames = ['TITLE', 'INTRO', 'PLAYING', 'BOSS', 'GAME_OVER', 'HIGH_SCORE'];

    // Capture at multiple time points
    for (const waitMs of [500, 1000, 1500, 2000, 3000, 5000]) {
      await new Promise(r => setTimeout(r, waitMs));

      const result = await page.evaluate(() => {
        const stateNames = ['TITLE', 'INTRO', 'PLAYING', 'BOSS', 'GAME_OVER', 'HIGH_SCORE'];
        const canvas = document.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        const game = canvas._game;
        const imageData = ctx.getImageData(0, 0, 320, 224);
        const data = imageData.data;

        // Game state
        const state = game.getState();

        // Title timers
        const titleTimer = game['titleTimer'] || 0;
        const titlePhase = game['titlePhase'] || 0;

        // Demo loop timer
        const demoLoopTimer = game['demoLoopTimer'] || 0;

        // Intro timer
        const introTimer = game['introTimer'] || 0;

        // Stage transition
        const stageTransitionTimer = game['stageTransitionTimer'] || 0;

        // Frame count
        const frame = game.frame;

        // Color stats
        const colorMap = new Map();
        let dark = 0, light = 0;
        for (let i = 0; i < data.length; i += 4) {
          const b = (data[i] + data[i+1] + data[i+2]) / 3;
          const key = `${data[i]},${data[i+1]},${data[i+2]}`;
          colorMap.set(key, (colorMap.get(key) || 0) + 1);
          if (b < 32) dark++;
          if (b > 200) light++;
        }

        const topColors = [...colorMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([color, count]) => {
            const [r, g, b] = color.split(',').map(Number);
            return { hex: `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`, count };
          });

        return {
          state,
          stateName: stateNames[state],
          titleTimer,
          titlePhase,
          demoLoopTimer,
          introTimer,
          stageTransitionTimer,
          frame,
          uniqueColors: colorMap.size,
          darkPct: ((dark / (320 * 224)) * 100).toFixed(1),
          lightPct: ((light / (320 * 224)) * 100).toFixed(1),
          topColors
        };
      });

      console.log(`After ${waitMs}ms:`);
      console.log(`  State: ${result.stateName}, Frame: ${result.frame}`);
      console.log(`  titleTimer: ${result.titleTimer.toFixed(3)}, titlePhase: ${result.titlePhase}`);
      console.log(`  demoLoopTimer: ${result.demoLoopTimer.toFixed(3)}, introTimer: ${result.introTimer.toFixed(3)}`);
      console.log(`  stageTransitionTimer: ${result.stageTransitionTimer.toFixed(3)}`);
      console.log(`  Colors: ${result.uniqueColors} unique, dark: ${result.darkPct}%, light: ${result.lightPct}%`);
      console.log(`  Top colors: ${result.topColors.map(c => `${c.hex}(${c.count})`).join(', ')}`);
      console.log('');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await browser.close();
  }
}

main();
