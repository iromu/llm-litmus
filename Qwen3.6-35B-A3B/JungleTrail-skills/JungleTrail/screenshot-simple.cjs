const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--use-gl=swiftshader',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  let logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}]: ${msg.text()}`));
  page.on('pageerror', err => logs.push(`PAGE_ERROR: ${err.message}`));

  // Create a simple Three.js test page inline
  const testHtml = `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body style="margin:0; background:#000;">
  <canvas id="c" style="width:1920px;height:1080px;"></canvas>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
    }
  }
  </script>
  <script type="module">
    import * as THREE from 'three';
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(1920, 1080);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0xffffff, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(60, 1920/1080, 0.1, 100);
    camera.position.set(0, 0, 5);

    // Add a red cube
    const geo = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(geo, mat);
    scene.add(cube);

    // Add a light
    scene.add(new THREE.DirectionalLight(0xffffff, 1));
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Render once
    renderer.render(scene, camera);

    // Write status to window
    window._testResult = {
      canvasW: canvas.width,
      canvasH: canvas.height,
      status: 'rendered'
    };

    // Also try to read a pixel
    const pixels = new Uint8Array(4);
    renderer.getContext().readPixels(0, 0, 1, 1, renderer.getContext().RGBA, renderer.getContext().UNSIGNED_BYTE, pixels);
    window._testPixel = { r: pixels[0], g: pixels[1], b: pixels[2], a: pixels[3] };
  </script>
</body>
</html>
  `;

  // Serve the test page
  console.log('Loading test page...');
  await page.setContent(testHtml, { waitUntil: 'load', timeout: 10000 });
  await new Promise(r => setTimeout(r, 2000));

  // Check test result
  const result = await page.evaluate(() => window._testResult);
  const pixel = await page.evaluate(() => window._testPixel);
  console.log('Test result:', JSON.stringify(result, null, 2));
  console.log('Test pixel:', JSON.stringify(pixel, null, 2));

  // Screenshot
  const outputPath = '/tmp/threejs_test.png';
  await page.screenshot({ path: outputPath, fullPage: false });
  console.log('Screenshot saved to', outputPath);
  const stats = fs.statSync(outputPath);
  console.log('Screenshot size:', stats.size, 'bytes');

  if (logs.length > 0) {
    console.log(`\n${logs.length} console entries:`);
    logs.forEach(l => console.log('  ' + l));
  }

  await browser.close();
  console.log('Done.');
})().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
