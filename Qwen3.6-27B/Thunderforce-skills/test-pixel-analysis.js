/**
 * Detailed pixel analysis test for Volt Storm
 * Verifies specific game elements render correctly
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Volt Storm Detailed Pixel Analysis ===\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  // Capture console errors
  const consoleErrors = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('[1] Navigating to game...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(500);

    // Test 1: Canvas exists and is correct size
    console.log('\n[Test 1] Canvas resolution');
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return {
        exists: !!canvas,
        width: canvas?.width,
        height: canvas?.height,
        cssWidth: canvas?.clientWidth,
        cssHeight: canvas?.clientHeight,
      };
    });
    console.log(`  Canvas: ${canvasInfo.width}x${canvasInfo.height} (CSS: ${canvasInfo.cssWidth}x${canvasInfo.cssHeight})`);
    assert(canvasInfo.width === 320 && canvasInfo.height === 224, 'Canvas is 320x224');

    // Test 2: Title screen has text (check for non-background pixels in title area)
    console.log('\n[Test 2] Title screen content');
    const titleContent = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check top-center area for title text
      let titlePixels = 0;
      for (let y = 30; y < 80; y++) {
        for (let x = 80; x < 240; x++) {
          const i = (y * 320 + x) * 4;
          if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
            titlePixels++;
          }
        }
      }

      // Check bottom area for "PRESS START" text
      let bottomPixels = 0;
      for (let y = 180; y < 220; y++) {
        for (let x = 80; x < 240; x++) {
          const i = (y * 320 + x) * 4;
          if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
            bottomPixels++;
          }
        }
      }

      return { titlePixels, bottomPixels };
    });
    console.log(`  Title area pixels: ${titleContent.titlePixels}`);
    console.log(`  Bottom area pixels: ${titleContent.bottomPixels}`);
    assert(titleContent.titlePixels > 50, 'Title text visible');

    // Test 3: Wait for gameplay and check player ship
    // Title: ~6.5s (phase 0: 1s + phase 1: ~2.5s subtitle scroll + phase 2: 3s), Intro: 2s, so gameplay starts at ~8.5s. Wait 9.5s total.
    console.log('\n[Test 3] Player ship rendering');
    await sleep(9500); // Wait past title + intro

    const playerData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Search for player ship colors (cyan, light blue, blue) in left third of screen
      // Player base is at x:64, but AI moves it around. Ship is ~20x14 pixels.
      let playerPixels = 0;
      let bestY = 112;
      let colors = new Set();

      // Search left third of screen for ship-colored pixels
      for (let y = 40; y < 190; y++) {
        for (let x = 20; x < 140; x++) {
          const i = (y * 320 + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Player ship colors: cyan (#00ffff), lightBlue (#0088ff), blue (#0000aa), white (#ffffff)
          const isCyan = r < 50 && g > 200 && b > 200;
          const isLightBlue = r < 50 && g > 100 && g < 200 && b > 200;
          const isBlue = r < 50 && g < 50 && b > 100;
          const isWhite = r > 200 && g > 200 && b > 200;
          if (isCyan || isLightBlue || isBlue || isWhite) {
            playerPixels++;
            colors.add(`${r},${g},${b}`);
            bestY = y;
          }
        }
      }

      return { playerPixels, estimatedY: bestY, colorCount: colors.size };
    });
    console.log(`  Player area pixels: ${playerData.playerPixels}`);
    console.log(`  Estimated Y: ${playerData.estimatedY}`);
    console.log(`  Unique colors: ${playerData.colorCount}`);
    assert(playerData.playerPixels > 10, 'Player ship visible');

    // Test 4: Check for scrolling background
    console.log('\n[Test 4] Parallax scrolling');
    const bgCheck1 = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      // Hash a region
      let hash = 0;
      for (let i = 0; i < imageData.data.length; i += 40) {
        hash += imageData.data[i];
      }
      return hash;
    });
    await sleep(1000);
    const bgCheck2 = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      let hash = 0;
      for (let i = 0; i < imageData.data.length; i += 40) {
        hash += imageData.data[i];
      }
      return hash;
    });
    console.log(`  Frame hash 1: ${bgCheck1}`);
    console.log(`  Frame hash 2: ${bgCheck2}`);
    assert(bgCheck1 !== bgCheck2, 'Background is scrolling (frames differ)');

    // Test 5: Check for bullets (bright pixels in gameplay area)
    console.log('\n[Test 5] Bullet rendering');
    const bulletCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check right side for player bullets (bright cyan/yellow pixels)
      let brightPixels = 0;
      for (let y = 60; y < 170; y++) {
        for (let x = 80; x < 280; x++) {
          const i = (y * 320 + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Look for bright bullet colors (cyan, yellow, white)
          if ((g > 150 && b > 150 && r < 100) || (r > 200 && g > 200 && b < 100)) {
            brightPixels++;
          }
        }
      }
      return brightPixels;
    });
    console.log(`  Bright bullet-like pixels: ${bulletCheck}`);

    // Test 6: Check for enemies
    console.log('\n[Test 6] Enemy rendering');
    const enemyCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check right side for enemies (red/orange pixels)
      let enemyPixels = 0;
      for (let y = 40; y < 190; y++) {
        for (let x = 150; x < 300; x++) {
          const i = (y * 320 + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Look for enemy colors (red/orange)
          if (r > 100 && g < 80 && b < 50) {
            enemyPixels++;
          }
        }
      }
      return enemyPixels;
    });
    console.log(`  Enemy-like pixels: ${enemyCheck}`);

    // Test 7: Check HUD elements (wait for gameplay state)
    console.log('\n[Test 7] HUD rendering');
    await sleep(2000); // Extra time for gameplay to settle

    const stateCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return { state: -1 };
      return { state: canvas._game.getState() };
    });
    console.log(`  Game state: ${stateCheck.state} (3=PLAYING, 4=BOSS)`);
    const hudCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check top bar for HUD elements
      let hudPixels = 0;
      for (let y = 0; y < 20; y++) {
        for (let x = 0; x < 320; x++) {
          const i = (y * 320 + x) * 4;
          if (data[i] > 30 || data[i + 1] > 30 || data[i + 2] > 30) {
            hudPixels++;
          }
        }
      }
      return hudPixels;
    });
    console.log(`  HUD area pixels: ${hudCheck}`);
    assert(hudCheck > 100, 'HUD is visible');

    // Test 8: Check CRT effects (scanlines)
    console.log('\n[Test 8] CRT effects');
    const crtCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check if even/odd rows have different brightness (scanlines)
      let evenSum = 0, oddSum = 0;
      let count = 0;
      for (let y = 100; y < 120; y++) {
        for (let x = 140; x < 180; x++) {
          const i = (y * 320 + x) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (y % 2 === 0) evenSum += brightness;
          else oddSum += brightness;
          count++;
        }
      }
      const evenAvg = evenSum / (count / 2);
      const oddAvg = oddSum / (count / 2);
      return { evenAvg, oddAvg, diff: Math.abs(evenAvg - oddAvg) };
    });
    console.log(`  Even row avg: ${crtCheck.evenAvg.toFixed(1)}`);
    console.log(`  Odd row avg: ${crtCheck.oddAvg.toFixed(1)}`);
    console.log(`  Difference: ${crtCheck.diff.toFixed(1)}`);

    // Test 9: Check game state transitions
    console.log('\n[Test 9] Game state machine');
    const stateMachineCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return null;
      const game = canvas._game;
      return {
        state: game.getState(),
        frame: game.frame,
      };
    });
    console.log(`  Current state: ${stateMachineCheck?.state}`);
    console.log(`  Frame count: ${stateMachineCheck?.frame}`);
    assert(stateMachineCheck?.state !== undefined, 'Game state accessible');

    // Test 10: Measure FPS over 2 seconds
    console.log('\n[Test 10] FPS measurement');
    const fpsStart = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return null;
      return canvas._game.frame;
    });
    await sleep(2000);
    const fpsEnd = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return null;
      return canvas._game.frame;
    });
    if (fpsStart !== null && fpsEnd !== null) {
      const fps = (fpsEnd - fpsStart) / 2;
      console.log(`  Frames: ${fpsStart} -> ${fpsEnd}`);
      console.log(`  FPS: ${fps.toFixed(1)}`);
      if (fps >= 55) {
        console.log('  ✓ PASS: Near target 60 FPS');
      } else if (fps >= 40) {
        console.log('  ⚠ ACCEPTABLE: Below target but playable');
      } else {
        console.log('  ✗ FAIL: Below acceptable FPS');
      }
    } else {
      console.log('  ⚠ Could not read frame count from game');
    }

    // Test 11: Check for particle effects
    console.log('\n[Test 11] Particle effects');
    const particleCheck = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, 320, 224);
      const data = imageData.data;

      // Check behind player for engine trail (orange/yellow particles)
      let trailPixels = 0;
      for (let y = 90; y < 140; y++) {
        for (let x = 0; x < 30; x++) {
          const i = (y * 320 + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Engine trail colors (orange/yellow)
          if (r > 150 && g > 50 && g < 150 && b < 50) {
            trailPixels++;
          }
        }
      }
      return trailPixels;
    });
    console.log(`  Engine trail pixels: ${particleCheck}`);

    // Summary
    console.log('\n=== Console Errors ===');
    if (consoleErrors.length > 0) {
      consoleErrors.forEach(e => console.log(`  ⚠ ${e}`));
    } else {
      console.log('  No errors');
    }

    console.log('\n=== Test Complete ===');

  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.log(`  ✗ FAIL: ${message}`);
  }
}

main();
