import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8899;

function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = req.url === '/' ? '/index.html' : req.url;
      filePath = path.join(__dirname, filePath);
      
      const ext = path.extname(filePath);
      const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
      };
      
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`Server on http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function main() {
  const server = await createServer();
  
  try {
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

    page.on('console', msg => console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`PAGE_ERROR: ${err.message}`));

    console.log('Navigating to simple test...');
    await page.goto(`http://127.0.0.1:${PORT}/simple-test.html`, { waitUntil: 'networkidle0', timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 3000));

    // Check canvas state
    const canvasState = await page.evaluate(() => {
      const c = document.getElementById('c');
      if (!c) return 'NO_CANVAS';
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      return {
        size: { width: c.width, height: c.height },
        gl: gl ? 'OK' : 'NO_GL',
        error: gl ? gl.getError() : -1,
      };
    });
    console.log('Canvas state:', canvasState);

    // Get canvas as base64
    const base64 = await page.evaluate(() => window.__canvasData);

    if (base64) {
      const buffer = Buffer.from(base64.split(',')[1], 'base64');
      fs.writeFileSync('/tmp/jungle_simple_test.png', buffer);
      console.log('Screenshot saved to /tmp/jungle_simple_test.png');
      
      // Analyze
      const { execSync } = await import('child_process');
      const stats = execSync('python3 -c "from PIL import Image; import numpy as np; img = Image.open(\'/tmp/jungle_simple_test.png\'); arr = np.array(img); h, w = arr.shape[:2]; print(f\"Avg: R={arr[:,:,0].mean():.1f} G={arr[:,:,1].mean():.1f} B={arr[:,:,2].mean():.1f}\")"', { encoding: 'utf-8' });
      console.log('Stats:', stats.trim());
    } else {
      console.log('No canvas data received');
    }

    await browser.close();
  } finally {
    server.close();
  }
  
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
