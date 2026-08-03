import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => console.log(`PAGE_ERROR: ${err.message}`));
  
  console.log('Navigating...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('DOM loaded.');
  
  // Immediately try evaluate to see if page is responsive
  console.log('Testing page responsiveness...');
  try {
    const result = await Promise.race([
      page.evaluate(() => document.title),
      new Promise((_, reject) => setTimeout(() => reject(new Error('evaluate timeout')), 5000))
    ]);
    console.log('Title:', result);
  } catch (e) {
    console.log('Evaluate failed:', e.message);
  }
  
  await browser.close();
  console.log('Done');
})();
