const fs = require('fs');
const html = fs.readFileSync('temp_docx_preview_output.html', 'utf8');
console.log('HTML length:', html.length);
const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
console.log('Tables found count:', tables.length);
if (tables.length > 0) {
  console.log('Table 0 attributes:', tables[0].slice(0, 150));
  const rows = tables[0].match(/<tr[\s\S]*?<\/tr>/g) || [];
  console.log('Table 0 rows count:', rows.length);
  rows.forEach((r, idx) => {
    const cells = r.match(/<td[\s\S]*?<\/td>/g) || [];
    console.log('Row', idx, 'cells:', cells.length);
    cells.forEach((c, cidx) => {
      console.log('  Cell', cidx, 'style:', c.slice(0, 120).replace(/\n/g, ' '));
    });
  });
}
