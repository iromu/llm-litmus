import puppeteer from 'puppeteer';
import fs from 'fs';

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome-stable',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-angle=swiftshader',
      '--window-size=1920,1080',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  await page.evaluateOnNewDocument(() => {
    window.__FULL_GAME = true;
    window.__DISABLE_POST_PROCESSING = true;
  });

  page.on('console', msg => console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => console.log(`PAGE_ERROR: ${err.message}`));

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('DOM loaded.');

  await new Promise(r => setTimeout(r, 15000));

  // Check WebGL status
  const webglInfo = await page.evaluate(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return 'NO_WEBGL';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      const vendor = gl.getParameter(gl.VENDOR);
      const version = gl.getParameter(gl.VERSION);
      return { webgl: 'OK', renderer, vendor, version };
    } catch (e) {
      return `WEBGL_ERROR: ${e.message}`;
    }
  });
  console.log('WebGL info:', webglInfo);

  // Force a manual render if game exists
  const renderResult = await page.evaluate(() => {
    const g = window.__game;
    if (g && g.renderer) {
      // Force render
      g.renderer.render(g.scene, g.camera);
      // Flush
      const gl = g.renderer.domElement.getContext('webgl2') || g.renderer.domElement.getContext('webgl');
      if (gl) {
        gl.finish();
        const pixels = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return { rendered: true, pixel: `R${pixels[0]}G${pixels[1]}B${pixels[2]}A${pixels[3]}` };
      }
    }
    return { rendered: false };
  });
  console.log('Manual render result:', renderResult);

  // Check canvas state
  const canvasState = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    if (!c) return 'NO_CANVAS';
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    return {
      size: { width: c.width, height: c.height },
      cssSize: { width: c.clientWidth, height: c.clientHeight },
      gl: gl ? 'OK' : 'NO_GL',
      error: gl ? gl.getError() : -1,
      // Sample some pixels from canvas
      pixelSamples: gl ? (() => {
        const pixels = new Uint8Array(5);
        gl.readPixels(0, 0, 1, 5, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels.slice(0, 5).map(v => `R${pixels[0]}G${pixels[1]}B${pixels[2]}`).join(',');
      })() : 'N/A',
    };
  });
  console.log('Canvas state:', canvasState);

  // Check game state
  const gameState = await page.evaluate(() => {
    const g = window.__game;
    if (!g) return 'NO_GAME';
    return {
      hasScene: !!g.scene,
      bgColor: g.scene?.background ? `0x${g.scene.background.getHexString()}` : 'none',
      childCount: g.scene?.children?.length ?? -1,
      cameraPos: g.camera?.position ? `(${g.camera.position.x},${g.camera.position.y},${g.camera.position.z})` : 'none',
      rendererInfo: g.renderer?.info ? {
        triangles: g.renderer.info.render.triangles,
        drawCalls: g.renderer.info.render.calls,
        textures: g.renderer.info.memory.textures,
        geometries: g.renderer.info.memory.geometries,
      } : 'no-info',
    };
  });
  console.log('Game state:', gameState);

  // Get canvas as base64
  console.log('Getting canvas data...');
  const canvasData = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    if (!c) return null;
    // Force render first
    const g = window.__game;
    if (g && g.renderer && g.scene && g.camera) {
      g.renderer.render(g.scene, g.camera);
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) gl.finish();
    }
    // Try both PNG and JPEG
    const base64PNG = c.toDataURL('image/png');
    const base64JPG = c.toDataURL('image/jpeg', 0.9);
    // Read full frame pixels
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    let pixelSamples = null;
    if (gl) {
      const w = c.width, h = c.height;
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      // Sample center pixel
      const cy = Math.floor(h/2), cx = Math.floor(w/2);
      const idx = (cy * w + cx) * 4;
      pixelSamples = {
        center: `R${pixels[idx]}G${pixels[idx+1]}B${pixels[idx+2]}A${pixels[idx+3]}`,
        topLeft: `R${pixels[0]}G${pixels[1]}B${pixels[2]}A${pixels[3]}`,
        bottomLeft: `R${pixels[(h-1)*w*4]}G${pixels[(h-1)*w*4+1]}B${pixels[(h-1)*w*4+2]}A${pixels[(h-1)*w*4+3]}`,
        totalPixels: w * h,
        nonZeroPixels: pixels.filter(p => p > 0).length,
      };
    }
    return { base64PNG, base64JPG, pixelSamples, canvasWidth: c.width, canvasHeight: c.height };
  });

  if (canvasData) {
    console.log('Canvas pixel samples:', JSON.stringify(canvasData.pixelSamples, null, 2));
    // Save JPEG (more reliable for WebGL canvases)
    if (canvasData.base64JPG) {
      const buffer = Buffer.from(canvasData.base64JPG.split(',')[1], 'base64');
      fs.writeFileSync('/tmp/jungle_pp_fixed.jpg', buffer);
      console.log('Screenshot saved to /tmp/jungle_pp_fixed.jpg');
    }
    // Also try PNG
    if (canvasData.base64PNG) {
      const buffer = Buffer.from(canvasData.base64PNG.split(',')[1], 'base64');
      fs.writeFileSync('/tmp/jungle_pp_fixed.png', buffer);
      console.log('PNG screenshot saved to /tmp/jungle_pp_fixed.png');
    }
  }

  await browser.close();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
