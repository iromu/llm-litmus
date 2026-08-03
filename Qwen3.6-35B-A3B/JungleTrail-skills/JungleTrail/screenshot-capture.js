import puppeteer from 'puppeteer';

const OUT_DIR = '/home/wantez/source/github/iromu/llm-litmus/Qwen3.6-35B-A3B/JungleTrail-skills/JungleTrail';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1920,1080',
      '--disable-web-security',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    console.log(`PAGE_ERROR: ${err.message}`);
  });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('DOM loaded, waiting for JS to execute...');
  // Wait for the module to load and game to initialize
  await new Promise(r => setTimeout(r, 5000));
  console.log('Game should be initialized.');

  // Check if canvas exists
  const canvasExists = await page.$('#game-canvas');
  if (!canvasExists) {
    // Get page content for debugging
    const body = await page.content();
    console.log('No canvas found. Page content length:', body.length);
    // Check for any error
    const errors = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).map(el => el.tagName).join(', ');
    });
    console.log('Element tags on page:', errors);
  }

  // Inject code to auto-start the game: click the blocker and simulate pointer lock
  console.log('Auto-starting game...');
  await page.evaluate(() => {
    // Wait for the blocker to exist
    return new Promise(resolve => {
      const check = () => {
        const blocker = document.querySelector('[style*="position: fixed"]');
        if (blocker) {
          // Click the blocker to trigger pointer lock
          blocker.click();
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  });

  // Wait for canvas to appear
  console.log('Waiting for canvas...');
  await page.waitForSelector('#game-canvas', { timeout: 15000 });
  console.log('Canvas found.');

  // Wait for the scene to fully render (Three.js needs time)
  console.log('Waiting for scene to render (10s)...');
  await new Promise(r => setTimeout(r, 10000));

  // Screenshot 1: Initial view
  console.log('Taking screenshot 1 (v2)...');
  await page.screenshot({
    path: `${OUT_DIR}/screenshot-terrain-v2.png`,
    fullPage: false,
  });
  console.log('Screenshot 1 saved.');

  // Now move the camera by injecting WASD key presses
  // Since pointer lock won't work in headless, we'll directly manipulate the camera position
  console.log('Moving camera via JS injection...');
  
  // Move camera forward and to the right by directly manipulating position
  await page.evaluate(() => {
    // Access the game instance and move the camera
    // The game stores camera in this.camera (private, but accessible in headless)
    // We'll use a different approach: dispatch keyboard events to simulate movement
    const forwardEvent = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true });
    document.dispatchEvent(forwardEvent);
    
    setTimeout(() => {
      const rightEvent = new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true });
      document.dispatchEvent(rightEvent);
    }, 500);
    
    setTimeout(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    }, 1000);
    
    setTimeout(() => {
      document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyD', key: 'd', bubbles: true }));
    }, 1500);
  });

  // Wait for the game loop to update the camera
  await new Promise(r => setTimeout(r, 3000));

  // Screenshot 2: After camera movement
  console.log('Taking screenshot 2 (v3)...');
  await page.screenshot({
    path: `${OUT_DIR}/screenshot-terrain-v3.png`,
    fullPage: false,
  });
  console.log('Screenshot 2 saved.');

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
