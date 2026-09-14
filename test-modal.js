const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/login');
  await page.type('input[type="email"]', 'admin_id@tpas.internal');
  await page.type('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
  
  await page.goto('http://localhost:3000/announcements');
  
  // Click 'New Announcement'
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const newBtn = buttons.find(b => b.textContent.includes('New Announcement'));
    if (newBtn) newBtn.click();
  });
  
  // Wait for modal to appear
  await page.waitForTimeout(1000);
  
  const modalHTML = await page.evaluate(() => {
    const modal = document.querySelector('.fixed.inset-0');
    return modal ? modal.outerHTML : 'No modal found';
  });
  
  console.log(modalHTML);
  await browser.close();
})();
