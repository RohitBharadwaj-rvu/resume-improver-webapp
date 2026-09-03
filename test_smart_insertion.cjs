const puppeteer = require('puppeteer-core');

async function testSmartInsertion() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));

  const result = await page.evaluate(() => {
    const container = document.querySelector('.docx-render-stage');
    if (!container) return { success: false, reason: 'No stage' };

    // Function to insert safely
    const snippet = "Authored comprehensive Product Requirement Documents (PRDs) translating business objectives into measurable outcomes.";
    const targetSection = "Experience";

    const sectionKeywords = targetSection.toLowerCase().split(/[\s&/]+/);
    const allElements = Array.from(container.querySelectorAll('p, h1, h2, h3, h4, span, div, td'));

    let targetHeaderEl = null;
    for (const el of allElements) {
      const text = el.innerText ? el.innerText.trim().toLowerCase() : '';
      if (text.length > 2 && text.length < 40) {
        if (sectionKeywords.some(kw => text.includes(kw))) {
          targetHeaderEl = el;
          break;
        }
      }
    }

    if (!targetHeaderEl) return { success: false, reason: 'Header not found' };

    const containerCell = targetHeaderEl.closest('td, section, div');
    if (!containerCell) return { success: false, reason: 'Cell not found' };

    // Find existing paragraphs or list items in this cell
    const siblings = Array.from(containerCell.querySelectorAll('p, li'));
    const lastSibling = siblings[siblings.length - 1];

    const newEl = document.createElement(lastSibling && lastSibling.tagName === 'LI' ? 'li' : 'p');
    if (lastSibling) {
      newEl.className = lastSibling.className;
      newEl.style.cssText = lastSibling.style.cssText;
    }
    newEl.innerText = snippet;
    newEl.style.borderLeft = '3px solid #10b981';
    newEl.style.paddingLeft = '6px';
    newEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';

    if (lastSibling && lastSibling.parentElement) {
      lastSibling.parentElement.appendChild(newEl);
    } else {
      containerCell.appendChild(newEl);
    }

    return {
      success: true,
      header: targetHeaderEl.innerText.trim(),
      cellWidth: containerCell.getBoundingClientRect().width,
      insertedTag: newEl.tagName,
      insertedText: newEl.innerText
    };
  });

  console.log('Smart insertion test result:', result);

  // Take screenshot to inspect layout
  await page.screenshot({ path: 'test_insertion_visual.png' });
  console.log('Saved screenshot to test_insertion_visual.png');

  await browser.close();
}

testSmartInsertion().catch(console.error);
