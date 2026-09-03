const puppeteer = require('puppeteer-core');

async function testAccept() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2500));

  // Capture initial document text and HTML length
  const beforeInfo = await page.evaluate(() => {
    const editor = document.querySelector('.docx-render-stage');
    return {
      textLength: editor ? editor.innerText.length : 0,
      first100: editor ? editor.innerText.slice(0, 100) : '',
      last100: editor ? editor.innerText.slice(-100) : ''
    };
  });

  console.log('Before Accept - Document Text Length:', beforeInfo.textLength);

  // Click Accept button on first pending suggestion
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const acceptBtn = buttons.find(b => b.textContent && b.textContent.trim().includes('Accept'));
    if (acceptBtn) {
      acceptBtn.click();
      return true;
    }
    return false;
  });

  console.log('Accept Button Clicked:', clicked);
  await new Promise(r => setTimeout(r, 1000));

  // Capture after document text
  const afterInfo = await page.evaluate(() => {
    const editor = document.querySelector('.docx-render-stage');
    return {
      textLength: editor ? editor.innerText.length : 0,
      first100: editor ? editor.innerText.slice(0, 100) : '',
      last100: editor ? editor.innerText.slice(-100) : ''
    };
  });

  console.log('After Accept - Document Text Length:', afterInfo.textLength);
  console.log('Did Document Change?:', beforeInfo.textLength !== afterInfo.textLength);

  await browser.close();
}

testAccept().catch(console.error);
