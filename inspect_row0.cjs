const fs = require('fs');
const html = fs.readFileSync('temp_docx_preview_output.html', 'utf8');
const row0 = html.match(/<tr[\s\S]*?<\/tr>/);
if (row0) {
  console.log('Row 0 HTML:');
  console.log(row0[0].slice(0, 1000));
}
