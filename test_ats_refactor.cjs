const jd = `Serve as the principal product authority across core infrastructure teams, leading complex cross-functional alignments and autonomously navigating architecture, security, and global compliance reviews.
Drive industry-first, non-intuitive product innovations and translate them into a highly differentiated cloud adoption portfolio.
Own Product Requirement Documents (PRDs) by overseeing collaboration with partner teams (Engineers, Program Managers, UX) to establish, collect, and track appropriate product and business metrics...
Responsibilities:
- Minimum qualifications
- Preferred qualifications
- About The Job`;

const SECTION_HEADER_BLOCKLIST = new Set([
  'responsibilities',
  'key responsibilities',
  'about the job',
  'about the role',
  'about us',
  'minimum qualifications',
  'preferred qualifications',
  'basic qualifications',
  'qualifications',
  'requirements',
  'job requirements',
  'job description',
  'overview',
  'role overview',
  'who you are',
  'what you will do',
  'benefits',
  'compensation',
]);

const DOMAIN_TERMS = [
  'Product Requirement Documents', 'PRDs', 'PRD', 'Cloud Adoption', 'Architecture',
  'Global Compliance', 'Cross-Functional Alignment', 'Infrastructure', 'Security',
  'Business Metrics', 'Product Innovations', 'Executive Leadership', 'P&L', 'GTM',
  'Agile', 'FinOps', 'CoE', 'AI-first', 'Digital Solutions', 'IoT', 'SDLC', 'PDLC'
];

// Test extraction
const extracted = [];
for (const term of DOMAIN_TERMS) {
  const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (regex.test(jd)) {
    extracted.push(term);
  }
}

console.log('Extracted relevant domain terms:', extracted);
console.log('Filtered out blocklist:', [...SECTION_HEADER_BLOCKLIST].filter(h => jd.toLowerCase().includes(h)));
