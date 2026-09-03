const puppeteer = require('puppeteer-core');
const path = require('path');

async function testUserJD() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for resume to load
  await new Promise((r) => setTimeout(r, 2000));

  // The user's exact JD from screenshot
  const exactUserJD = `Serve as the principal product authority across core infrastructure teams, leading complex cross-functional alignments and autonomously navigating architecture, security, and global compliance reviews.
Drive industry-first, non-intuitive product innovations and translate them into a highly differentiated cloud adoption portfolio.
Own Product Requirement Documents (PRDs) by overseeing collaboration with partner teams (Engineers, Program Managers, UX) to establish, collect, and track appropriate product and business metrics.

Responsibilities:
- Lead core cloud transformation initiatives
- Minimum qualifications: 10+ years product management
- Preferred qualifications: MS or MBA
- About The Job: Senior role leading cloud portfolios`;

  // Focus textarea and enter text
  await page.evaluate((text) => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      // Simulate typing/pasting
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(textarea, text);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, exactUserJD);

  // Wait 1.8 seconds for the debounced evaluation to complete
  await new Promise((r) => setTimeout(r, 1800));

  // Extract the keywords displayed on screen
  const keywordsInfo = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.lg\\:col-span-3 span.font-medium'));
    return items.map((el) => el.innerText.trim());
  });
  console.log('Extracted Keywords on Screen:', keywordsInfo);

  const screenshotPath = path.join(__dirname, 'user_jd_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

testUserJD().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
