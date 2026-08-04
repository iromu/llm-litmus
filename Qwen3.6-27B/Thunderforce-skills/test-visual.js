/**
 * Visual test harness for Volt Storm attract mode demo
 * Takes screenshots at key moments and verifies pixel content
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, 'test-output');
const PORT = 3002;
const BASE_URL = `http://localhost:${PORT}`;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function screenshot(page, name) {
  const path = `${OUTPUT_DIR}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓ Screenshot: ${name}`);
  return path;
}

async function getCanvasPixels(page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Sample center region to check for content
    const w = canvas.width, h = canvas.height;
    const centerW = 40, centerH = 20;
    const startX = Math.floor((w - centerW) / 2);
    const startY = Math.floor((h - centerH) / 2);
    let nonBlack = 0;
    let total = 0;
    for (let y = startY; y < startY + centerH; y++) {
      for (let x = startX; x < startX + centerW; x++) {
        const i = (y * w + x) * 4;
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        total++;
        if (r > 10 || g > 10 || b > 10) {
          nonBlack++;
        }
      }
    }
    return {
      width: w,
      height: h,
      nonBlackRatio: nonBlack / total,
      totalPixels: total,
    };
  });
}

async function getGameState(page) {
  return await page.evaluate(() => {
    // Access the game instance
    const canvas = document.querySelector('canvas');
    if (!canvas || !canvas._game) return null;
    return canvas._game.getState();
  });
}

async function main() {
  console.log('=== Volt Storm Visual Test Harness ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 448 });

    // Enable performance logging
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    console.log('[1] Navigating to game...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(1000);

    console.log('[2] Checking initial render...');
    const pixels1 = await getCanvasPixels(page);
    console.log(`  Canvas: ${pixels1?.width}x${pixels1?.height}`);
    console.log(`  Non-black ratio: ${(pixels1?.nonBlackRatio || 0).toFixed(2)}`);

    if (!pixels1 || pixels1.width !== 320 || pixels1.height !== 224) {
      console.error('  ✗ FAIL: Canvas is not 320x224');
      process.exit(1);
    }
    console.log('  ✓ PASS: Canvas resolution is 320x224');

    // Title screen
    console.log('\n[3] Testing Title Screen...');
    await screenshot(page, '01_title_screen');
    const titlePixels = await getCanvasPixels(page);
    if (titlePixels && titlePixels.nonBlackRatio > 0.01) {
      console.log('  ✓ PASS: Title screen has visible content');
    } else {
      console.error('  ✗ FAIL: Title screen is blank');
    }

    // Wait for gameplay to start (title auto-starts after 4 seconds)
    console.log('\n[4] Waiting for gameplay to start (4s)...');
    await sleep(4500);

    console.log('[5] Testing Gameplay...');
    await screenshot(page, '02_gameplay_start');
    const gameplayPixels = await getCanvasPixels(page);
    console.log(`  Non-black ratio: ${(gameplayPixels?.nonBlackRatio || 0).toFixed(2)}`);
    if (gameplayPixels && gameplayPixels.nonBlackRatio > 0.05) {
      console.log('  ✓ PASS: Gameplay has visible content');
    } else {
      console.error('  ✗ FAIL: Gameplay is blank');
    }

    // Check for player ship (should be on left side of screen)
    const playerVisible = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check left third of screen for non-black pixels (player area)
      const w = canvas.width, h = canvas.height;
      let nonBlack = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w / 3; x++) {
          const i = (y * w + x) * 4;
          if (imageData.data[i] > 10 || imageData.data[i + 1] > 10 || imageData.data[i + 2] > 10) {
            nonBlack++;
          }
        }
      }
      return nonBlack / (h * (w / 3)) > 0.01;
    });
    console.log(`  Player area visible: ${playerVisible ? '✓' : '✗'}`);

    // Wait for more gameplay and check for enemies/bullets
    console.log('\n[6] Waiting for enemies to spawn (5s)...');
    await sleep(5000);
    await screenshot(page, '03_gameplay_enemies');

    // Check FPS
    console.log('\n[7] Measuring FPS...');
    const fpsData = await page.evaluate(() => {
      return new Promise((resolve) => {
        const canvas = document.querySelector('canvas');
        if (!canvas || !canvas._game) {
          resolve(null);
          return;
        }
        const game = canvas._game;
        // Read frame count
        const startFrame = game.frame;
        setTimeout(() => {
          resolve({
            startFrame,
            endFrame: game.frame,
            frames: game.frame - startFrame,
          });
        }, 2000);
      });
    });
    if (fpsData) {
      const fps = fpsData.frames / 2;
      console.log(`  Frames in 2s: ${fpsData.frames}`);
      console.log(`  Estimated FPS: ${fps}`);
      if (fps > 50) {
        console.log('  ✓ PASS: FPS is near target (60)');
      } else if (fps > 30) {
        console.log('  ⚠ WARN: FPS is below target but acceptable');
      } else {
        console.error('  ✗ FAIL: FPS is too low');
      }
    }

    // Wait for boss encounter
    console.log('\n[8] Waiting for first boss (15s)...');
    await sleep(15000);
    await screenshot(page, '04_boss_encounter');

    // Check for boss (large object on screen)
    const bossCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { hasBoss: false };
      const ctx = canvas.getContext('2d');
      if (!ctx) return { hasBoss: false };
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const w = canvas.width, h = canvas.height;
      // Check center-right area for boss
      let nonBlack = 0;
      let total = 0;
      for (let y = 40; y < 180; y++) {
        for (let x = 100; x < 280; x++) {
          const i = (y * w + x) * 4;
          total++;
          if (imageData.data[i] > 20 || imageData.data[i + 1] > 20 || imageData.data[i + 2] > 20) {
            nonBlack++;
          }
        }
      }
      return { hasBoss: nonBlack / total > 0.1 };
    });
    console.log(`  Boss area active: ${bossCheck.hasBoss ? '✓' : '✗'}`);

    // Wait for game over
    console.log('\n[9] Waiting for game over screen...');
    const demoDuration = 60; // CONFIG.DEMO_DURATION
    const remaining = demoDuration - 25; // We've already waited ~25s
    if (remaining > 0) {
      console.log(`  Waiting ${remaining}s for demo to end...`);
      await sleep(remaining * 1000);
    }
    await screenshot(page, '05_game_over');

    // Wait for high score
    console.log('\n[10] Waiting for high score screen (6s)...');
    await sleep(6000);
    await screenshot(page, '06_high_scores');

    // Wait for title screen loop
    console.log('\n[11] Waiting for title screen loop (2s)...');
    await sleep(2000);
    await screenshot(page, '07_title_loop');

    // Final console check
    console.log('\n[12] Checking console for errors...');
    const consoleErrors = await page.evaluate(() => {
      return window.__consoleErrors || [];
    });
    if (consoleErrors.length > 0) {
      console.log(`  ⚠ ${consoleErrors.length} console errors/warnings:`);
      consoleErrors.slice(0, 5).forEach(e => console.log(`    - ${e}`));
    } else {
      console.log('  ✓ No console errors');
    }

    // Summary
    console.log('\n=== Test Summary ===');
    console.log(`Screenshots saved to: ${OUTPUT_DIR}`);
    console.log(`Files: ${fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png')).length} PNGs`);
    console.log('\nTest complete!');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
