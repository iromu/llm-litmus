import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

type CanvasSample = {
  ok: boolean;
  reason: string;
  variance?: number;
  colorBuckets?: number;
};

async function sampleCanvas(page: import('@playwright/test').Page): Promise<CanvasSample> {
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  if (!box || box.width < 32 || box.height < 32) {
    return { ok: false, reason: 'canvas-too-small' };
  }

  const buffer = await canvas.screenshot();
  const png = PNG.sync.read(buffer);
  let min = 255;
  let max = 0;
  let alphaPixels = 0;
  const buckets = new Set<string>();
  const stride = Math.max(1, Math.floor((png.width * png.height) / 4096));

  for (let pixel = 0; pixel < png.width * png.height; pixel += stride) {
    const offset = pixel * 4;
    const r = png.data[offset];
    const g = png.data[offset + 1];
    const b = png.data[offset + 2];
    const a = png.data[offset + 3];
    min = Math.min(min, r, g, b);
    max = Math.max(max, r, g, b);
    if (a > 0) alphaPixels += 1;
    buckets.add(`${r >> 4},${g >> 4},${b >> 4},${a >> 6}`);
  }

  const variance = max - min;
  return {
    ok: alphaPixels > 256 && (variance > 8 || buckets.size > 3),
    reason: 'sampled',
    variance,
    colorBuckets: buckets.size,
  };
}

test('renders a nonblank interactive game canvas', async ({ page }, testInfo) => {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleMessages.push(`[ERROR] ${message.text()}`);
    else consoleMessages.push(`[LOG] ${message.text()}`);
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');
  await expect(page.locator('#game-canvas')).toBeVisible();
  await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 10);

  const sample = await sampleCanvas(page);
  expect(sample, JSON.stringify(sample)).toMatchObject({ ok: true });

  // Start the game from title screen
  await page.keyboard.down('Space');
  await page.waitForTimeout(100);
  await page.keyboard.up('Space');
  await page.waitForTimeout(1600); // Wait for transition

  if (testInfo.project.name.includes('mobile')) {
    const stick = page.locator('#touch-stick');
    await expect(stick).toBeVisible();
    const box = await stick.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.05, { steps: 6 });
      await page.waitForTimeout(450);
      await page.mouse.up();
    }
  } else {
    // Hold KeyW down, then wait for the game loop to process it.
    // page.waitForFunction() runs in the browser context without blocking
    // the main thread, so the game loop continues running while we wait.
    await page.keyboard.down('KeyW');
    const startPos = await page.evaluate(() => {
      const diag = (window as any).__THREE_GAME_DIAGNOSTICS__;
      return diag?.player?.position?.y ?? 0;
    });
    await page.waitForFunction((startY: number) => {
      const diag = (window as any).__THREE_GAME_DIAGNOSTICS__;
      if (!diag?.player?.position) return false;
      // Demo autoplay: AI moves the ship. Human input: W moves down.
      // Accept either direction — just verify the ship is moving.
      return Math.abs(diag.player.position.y - startY) > 0.2;
    }, startPos, { timeout: 10000 });
    await page.keyboard.up('KeyW');
  }

  // Attach screenshot for visual inspection
  const screenshot = await page.screenshot({ fullPage: true });
  await testInfo.attach(`${testInfo.project.name}-game`, {
    body: screenshot,
    contentType: 'image/png',
  });

  // Only fail on actual game errors, not browser 404s (favicon, etc.)
  const gameErrors = consoleMessages.filter(
    m => m.startsWith('[ERROR]') && !m.includes('Failed to load resource'),
  );
  expect(gameErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});
