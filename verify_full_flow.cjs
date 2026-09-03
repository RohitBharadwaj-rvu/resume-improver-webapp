const puppeteer = require('puppeteer-core');
const path = require('path');

async function verify() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  console.log('Opening web app...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });

  // Wait for resume to load
  await new Promise((r) => setTimeout(r, 2000));

  // Paste a matching Job Description in the left textarea
  const sampleJD = `Director of Product Management - AI & Cloud Solutions
Role Overview:
We are seeking an executive Director of Product Management to lead our AI-first and Cloud Transformation business unit.
You will have P&L accountability, driving strategic product roadmaps and GTM partnerships.

Responsibilities:
- Drive enterprise product management for AI and Cloud platforms across multi-cloud environments
- Oversee P&L and revenue growth for a $200M+ portfolio
- Establish Centers of Excellence (CoEs) in Generative AI and FinOps
- Lead cross-functional engineering teams in SDLC/PDLC innovation
- Scale agile digital products from alpha to production with measurable ROI

Requirements:
- 15+ years of experience in IT & Consulting product leadership
- Proven success in AI-first digital solutions, IoT platforms, and cloud optimization
- Strong executive leadership, customer-centric product strategy, and stakeholder management`;

  await page.focus('textarea');
  await page.keyboard.type(sampleJD);
  console.log('Pasted sample Job Description...');

  // Wait 1.5 seconds for live ATS evaluation
  await new Promise((r) => setTimeout(r, 1500));

  // Click Re-Evaluate ATS Score
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Re-Evaluate ATS Score'));
    if (btn) btn.click();
  });
  console.log('Clicked Re-Evaluate ATS Score button...');
  await new Promise((r) => setTimeout(r, 1500));

  const screenshotPath = path.join(__dirname, 'full_flow_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Verification screenshot saved to:', screenshotPath);

  // Extract score
  const scoreInfo = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.innerText.replace(/\n+/g, ' ') : 'unknown';
  });
  console.log('Live Header Score:', scoreInfo);

  await browser.close();
}

verify().catch((err) => {
  console.error('Error in verification:', err);
  process.exit(1);
});
