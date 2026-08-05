/**
 * Analyze screenshot pixel content using Puppeteer
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  const files = fs.readdirSync('test-output').filter(f => f.match(/^\d\d_/)).sort();
  
  console.log('=== Screenshot Pixel Content Analysis ===\n');
  
  for (const file of files) {
    const imgData = fs.readFileSync(`test-output/${file}`);
    const base64 = imgData.toString('base64');
    
    await page.setContent(`
      <img id="test" src="data:image/png;base64,${base64}" crossorigin="anonymous"/>
    `);
    await page.waitForSelector('#test');
    
    const result = await page.evaluate(() => {
      const img = document.getElementById('test');
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let nonBlack = 0, brightPixels = 0;
      let avgR = 0, avgG = 0, avgB = 0;
      const colorCounts = {};
      const totalPixels = canvas.width * canvas.height;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r + g + b) / 3;
        
        if (brightness > 5) nonBlack++;
        if (brightness > 128) brightPixels++;
        avgR += r; avgG += g; avgB += b;
        
        const key = `${Math.floor(r/64)*64},${Math.floor(g/64)*64},${Math.floor(b/64)*64}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }
      
      avgR = Math.round(avgR / totalPixels);
      avgG = Math.round(avgG / totalPixels);
      avgB = Math.round(avgB / totalPixels);
      
      const sorted = Object.entries(colorCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);
      
      return {
        width: canvas.width,
        height: canvas.height,
        nonBlack,
        brightPixels,
        avgR, avgG, avgB,
        topColors: sorted.map(([c,n]) => ({ color: c, pct: Math.round(n/totalPixels*100) }))
      };
    });
    
    console.log(`${file}:`);
    console.log(`  Resolution: ${result.width}x${result.height}`);
    console.log(`  Non-black: ${result.nonBlack} (${(result.nonBlack/(result.width*result.height)*100).toFixed(1)}%)`);
    console.log(`  Bright pixels: ${result.brightPixels} (${(result.brightPixels/(result.width*result.height)*100).toFixed(1)}%)`);
    console.log(`  Avg color: rgb(${result.avgR},${result.avgG},${result.avgB})`);
    console.log(`  Top colors: ${result.topColors.map(c => `${c.color}(${c.pct}%)`).join(', ')}`);
    console.log();
  }
  
  await browser.close();
}

main().catch(console.error);
