const puppeteer = require('puppeteer-core');

async function testDiscussFlow() {
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

  // 1. Find and click the Discuss button
  const discussClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent && b.textContent.trim().includes('Discuss'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Discuss Button:', discussClicked);
  await new Promise(r => setTimeout(r, 1000));

  // Screenshot 1: Modal Opened
  await page.screenshot({ path: 'discuss_modal_open.png' });
  console.log('Screenshot saved: discuss_modal_open.png');

  // 2. Type message into the discussion input
  const userPrompt = 'Add $2.5M metrics and executive cloud cost optimization';
  await page.evaluate((text) => {
    const input = document.querySelector('input[placeholder*="Tell the agent about your actual experience"]');
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      ).set;
      nativeSetter.call(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    // Click send
    const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Send'));
    if (sendBtn) sendBtn.click();
  }, userPrompt);

  console.log('Sent user discussion message...');
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 2: Discussion in progress with adapted snippet
  await page.screenshot({ path: 'discuss_modal_adapted.png' });
  console.log('Screenshot saved: discuss_modal_adapted.png');

  // 3. Click "Apply & Insert into Resume"
  const insertClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const applyBtn = buttons.find(b => b.textContent && b.textContent.includes('Apply & Insert into Resume'));
    if (applyBtn) {
      applyBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Apply & Insert into Resume:', insertClicked);
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 3: Inserted into resume and modal closed
  await page.screenshot({ path: 'discuss_inserted_doc.png' });
  console.log('Screenshot saved: discuss_inserted_doc.png');

  // Check verification state
  const finalState = await page.evaluate(() => {
    const root = document.querySelector('.docx-editor-root');
    const headerScore = document.querySelector('header span');
    return {
      modalStillOpen: Boolean(document.querySelector('.fixed.inset-0')),
      hasInsertedMetrics: root ? root.innerText.includes('cost savings') || root.innerText.includes('$1.5M+') : false,
      score: headerScore ? headerScore.innerText : '',
    };
  });
  console.log('Final State after discussion insertion:', finalState);

  await browser.close();
}

testDiscussFlow().catch(console.error);
