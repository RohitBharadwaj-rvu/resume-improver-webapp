const puppeteer = require('puppeteer-core');

async function testAcceptWithJD() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  // Paste JD
  await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(textarea, 'Product Management, PRDs, Cloud Adoption, Global Compliance');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  // Wait for suggestions to generate
  await new Promise(r => setTimeout(r, 2000));

  const beforeDoc = await page.evaluate(() => {
    const stage = document.querySelector('.docx-render-stage');
    return {
      textLength: stage ? stage.innerText.length : 0,
      content: stage ? stage.innerText.slice(0, 200) : ''
    };
  });

  // Check suggestion count and click Accept
  const acceptResult = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const acceptBtn = buttons.find(b => b.textContent && b.textContent.trim() === 'Accept');
    if (acceptBtn) {
      acceptBtn.click();
      return { clicked: true, text: acceptBtn.textContent.trim() };
    }
    return { clicked: false };
  });

  console.log('Accept button click attempt:', acceptResult);
  await new Promise(r => setTimeout(r, 1000));

  const afterDoc = await page.evaluate(() => {
    const stage = document.querySelector('.docx-render-stage');
    return {
      textLength: stage ? stage.innerText.length : 0,
      content: stage ? stage.innerText.slice(0, 200) : ''
    };
  });

  console.log('Document length before:', beforeDoc.textLength);
  console.log('Document length after:', afterDoc.textLength);
  console.log('Did the document text change at all?:', beforeDoc.textLength !== afterDoc.textLength);

  await browser.close();
}

testAcceptWithJD().catch(console.error);
