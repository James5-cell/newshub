import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  // Also capture all response bodies if they fail parsing
  page.on('response', async res => {
    if (res.status() !== 200 && res.status() !== 304) {
      console.log('RES ERR:', res.url(), res.status());
    }
  });

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
  } catch(e) {
    console.error(e);
  }
  await browser.close();
})();
