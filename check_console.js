import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', req => console.log('REQ FAIL:', req.url(), req.failure()?.errorText));

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
  } catch (e) {
    console.log("Nav err:", e);
  }

  await browser.close();
})();
