const puppeteer = require('puppeteer-core');

async function testLive() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to app...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Measure initial document text length
  const beforeLen = await page.evaluate(() => {
    const root = document.querySelector('.docx-editor-root');
    return root ? root.innerText.length : 0;
  });
  console.log('Initial Document Length:', beforeLen);

  // Paste sample JD
  await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeSetter.call(textarea, 'Product Management, PRDs, Cloud Adoption, Global Compliance');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Wait for debounced evaluation & suggestions
  await new Promise(r => setTimeout(r, 2000));

  // Inspect suggestions in DOM
  const pendingCount = await page.evaluate(() => {
    const pendingTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Pending'));
    return pendingTab ? pendingTab.textContent : 'No pending tab';
  });
  console.log('Pending Tab Text:', pendingCount);

  // Find Accept button and click it
  const clickSuccess = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.trim().includes('Accept'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Accept Button:', clickSuccess);

  // Wait 1.5 seconds for insertion and DOM updates
  await new Promise(r => setTimeout(r, 1500));

  const afterLen = await page.evaluate(() => {
    const root = document.querySelector('.docx-editor-root');
    return root ? root.innerText.length : 0;
  });
  console.log('After Accept Document Length:', afterLen);
  console.log('Difference (Chars added to document):', afterLen - beforeLen);

  // Check if target section contains the snippet
  const verification = await page.evaluate(() => {
    const root = document.querySelector('.docx-editor-root');
    const text = root ? root.innerText : '';
    return {
      hasDemonstratedLeadership: text.includes('Demonstrated leadership applying') || text.includes('Product Requirement'),
      tableColumnsValid: document.querySelectorAll('td').length > 0,
    };
  });
  console.log('Verification Details:', verification);

  await page.screenshot({ path: 'accept_button_live_verified.png' });
  console.log('Saved screenshot to accept_button_live_verified.png');

  await browser.close();
}

testLive().catch(console.error);
