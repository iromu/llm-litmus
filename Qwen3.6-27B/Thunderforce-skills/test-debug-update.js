/**
 * Debug: patch update method to trace state updates
 */
import puppeteer from 'puppeteer';

const BASE_URL = 'http://localhost:3002';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== Update Method Trace ===\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--use-gl=swiftshader'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 320, height: 224, deviceScaleFactor: 1 });

    console.log('[1] Navigating to game...');

    // Collect console logs
    page.on('console', msg => {
      console.log(`  [PAGE] ${msg.text()}`);
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await sleep(1000);

    // Patch the update method to trace calls
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return;
      const game = canvas._game;
      const originalUpdate = game.update.bind(game);
      let callCount = 0;
      game.update = function(dt) {
        callCount++;
        if (callCount <= 20) {
          console.log(`update #${callCount}: dt=${dt}, state=${this.getState()}`);
        }
        return originalUpdate(dt);
      };
    });

    await sleep(5000);
    
    // Check state
    const info = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas || !canvas._game) return null;
      const game = canvas._game;
      return {
        state: game.getState(),
        frame: game.frame,
      };
    });
    console.log(`\nAfter 5s: state=${info?.state} frame=${info?.frame}`);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
