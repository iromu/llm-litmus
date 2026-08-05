/**
 * Debug: check game state transitions in Puppeteer
 */
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3002';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Game State Transition Debug ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    // Collect console logs
    page.on('console', msg => {
      console.log(`  [PAGE] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.log(`  [ERROR] ${err.message}`);
    });

    console.log('[1] Navigating to game...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(1000);

    // Check game state over time
    const states = {
      0: 'TITLE', 1: 'INTRO', 2: 'PLAYING', 3: 'BOSS', 4: 'GAME_OVER', 5: 'HIGH_SCORE'
    };

    for (let i = 0; i < 30; i++) {
      const info = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas || !canvas._game) return null;
        const game = canvas._game;
        return {
          state: game.getState(),
          frame: game.frame,
        };
      });
      
      if (info) {
        const stateName = states[info.state] || 'UNKNOWN';
        console.log(`  ${i * 1}s: state=${stateName} frame=${info.frame}`);
      } else {
        console.log(`  ${i * 1}s: game not found`);
      }
      
      await sleep(1000);
    }
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
