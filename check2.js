import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.addInitScript(() => {
    window.onerror = function(message, source, lineno, colno, error) {
      console.log('BROWSER_ERROR:', message, 'AT:', source, lineno + ':' + colno);
      if (error && error.stack) console.log('STACK:', error.stack);
    };
    window.addEventListener('unhandledrejection', event => {
      console.log('UNHANDLED_PROMISE:', event.reason);
    });
  });

  page.on('console', msg => console.log('LOG:', msg.text()));

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'load' });
    await page.waitForTimeout(2000);
  } catch(e) {}
  await browser.close();
})();
