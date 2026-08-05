/**
 * Debug: check game over timer
 */
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3002';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Game Over Timer Debug ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    console.log('[1] Navigating to game...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(1000);

    const states = {
      0: 'TITLE', 1: 'INTRO', 2: 'PLAYING', 3: 'BOSS', 4: 'GAME_OVER', 5: 'HIGH_SCORE'
    };

    for (let i = 0; i < 15; i++) {
      const info = await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (!canvas || !canvas._game) return null;
        const game = canvas._game;
        // Access private fields via bracket notation
        const keys = Object.getOwnPropertyNames(Object.getPrototypeOf(game));
        return {
          state: game.getState(),
          frame: game.frame,
          // Try to access timers
          gameOverTimer: game['gameOverTimer'],
          demoLoopTimer: game['demoLoopTimer'],
          titleTimer: game['titleTimer'],
          highScoreTimer: game['highScoreTimer'],
        };
      });
      
      if (info) {
        const stateName = states[info.state] || 'UNKNOWN';
        console.log(`  ${i}s: state=${stateName} frame=${info.frame} gameOver=${(info.gameOverTimer||0).toFixed(2)} demo=${(info.demoLoopTimer||0).toFixed(2)} title=${(info.titleTimer||0).toFixed(2)} hs=${(info.highScoreTimer||0).toFixed(2)}`);
      }
      
      await sleep(1000);
    }
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
