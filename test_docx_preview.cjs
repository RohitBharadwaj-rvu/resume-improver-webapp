const fs = require('fs');
const { JSDOM } = require('jsdom');
const docx = require('docx-preview');

async function test() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="output"></div></body></html>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.DOMParser = dom.window.DOMParser;
  global.XMLSerializer = dom.window.XMLSerializer;
  global.Node = dom.window.Node;

  try {
    const buffer = fs.readFileSync('public/sample-resume.docx');
    const container = dom.window.document.getElementById('output');
    await docx.renderAsync(buffer, container, undefined, { inWrapper: false });
    console.log('Success! InnerHTML length:', container.innerHTML.length);
    fs.writeFileSync('temp_docx_preview_output.html', container.innerHTML, 'utf8');
  } catch (e) {
    console.error('Caught error:', e);
  }
}
test();
