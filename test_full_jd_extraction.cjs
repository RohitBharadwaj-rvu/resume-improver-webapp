const jdText = `Serve as the principal product authority across core infrastructure teams, leading complex cross-functional alignments and autonomously navigating architecture, security, and global compliance reviews.
Drive industry-first, non-intuitive product innovations and translate them into a highly differentiated cloud adoption portfolio.
Own Product Requirement Documents (PRDs) by overseeing collaboration with partner teams (Engineers, Program Managers, UX) to establish, collect, and track appropriate product and business metrics.

Responsibilities:
- Lead core cloud transformation initiatives
- Minimum qualifications: 10+ years product management
- Preferred qualifications: MS or MBA
- About The Job: Senior role leading cloud portfolios`;

const SECTION_HEADER_BLOCKLIST = new Set([
  'responsibilities',
  'key responsibilities',
  'core responsibilities',
  'about the job',
  'about the role',
  'about us',
  'minimum qualifications',
  'preferred qualifications',
  'qualifications',
  'requirements',
  'job requirements',
  'skills & requirements',
  'benefits',
  'compensation',
]);

const DOMAIN_TERMS = [
  'Infrastructure', 'Architecture', 'Security', 'Global Compliance', 'Cloud Adoption',
  'Product Requirement Documents (PRDs)', 'PRD', 'PRDs', 'Cross-Functional Alignment',
  'Business Metrics', 'Product Innovations', 'Cloud Transformation', 'Product Management',
  'Agile', 'Scrum', 'P&L', 'GTM', 'CoE', 'FinOps', 'SDLC', 'PDLC', 'IoT', 'AI-first'
];

function cleanExtractedTerm(term) {
  return term
    .replace(/^(own|lead|drive|build|design|manage|serve|establish|oversee|scale|deliver|implement|develop|navigate)\s+/i, '')
    .trim();
}

const extracted = [];
const seen = new Set();

// 1. Match high-value domain terms
for (const term of DOMAIN_TERMS) {
  const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  if (pattern.test(jdText) && !seen.has(term.toLowerCase())) {
    seen.add(term.toLowerCase());
    extracted.push(term);
  }
}

// 2. Match acronym patterns
const acronymMatches = jdText.match(/([A-Z][a-zA-Z\s]{2,35})\s*\(([A-Z0-9&]{2,6})\)/g) || [];
for (const m of acronymMatches) {
  const cleaned = cleanExtractedTerm(m);
  if (!seen.has(cleaned.toLowerCase())) {
    seen.add(cleaned.toLowerCase());
    extracted.push(cleaned);
  }
}

console.log('Final Extracted Keywords:', extracted);
