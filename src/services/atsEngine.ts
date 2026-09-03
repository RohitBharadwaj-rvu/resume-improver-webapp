import type { ATSScoreBreakdown, ExtractedKeyword, Suggestion, LLMConfig } from '../types';

// Section headers and generic recruiter phrases that must NEVER be extracted as target keywords
const SECTION_HEADER_BLOCKLIST = new Set([
  'responsibilities',
  'key responsibilities',
  'core responsibilities',
  'role responsibilities',
  'about the job',
  'about the role',
  'about us',
  'about company',
  'company overview',
  'job description',
  'position overview',
  'role overview',
  'job summary',
  'summary',
  'profile',
  'what you will do',
  'what you will achieve',
  'what we are looking for',
  'who you are',
  'what you bring',
  'requirements',
  'job requirements',
  'skills & requirements',
  'minimum qualifications',
  'basic qualifications',
  'preferred qualifications',
  'desired qualifications',
  'qualifications',
  'benefits',
  'perks',
  'compensation',
  'salary',
  'equal opportunity',
  'equal opportunity employer',
  'how you will make an impact',
  'in this role you will',
  'nice to have',
  'education',
  'experience',
  'skills',
]);

// Curated technical skills, frameworks, and tools
const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C++', 'C#', 'Rust',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GitHub Actions', 'Jest', 'Vitest', 'Cypress', 'Tailwind CSS',
  'Next.js', 'Vue.js', 'Angular', 'Express', 'Django', 'Spring Boot', 'FastAPI', 'Microservices',
  'System Design', 'Agile', 'Scrum', 'Linux', 'DevOps', 'Terraform', 'Kafka', 'Elasticsearch',
  'IoT', 'FinOps', 'SDLC', 'PDLC', 'PRD', 'P&L', 'GTM', 'CoE', 'Generative AI', 'Machine Learning',
  'Deep Learning', 'NLP', 'Data Pipelines', 'Snowflake', 'BigQuery', 'Tableau', 'PowerBI'
];

const STRONG_ACTION_VERBS = [
  'architected', 'spearheaded', 'orchestrated', 'engineered', 'streamlined', 'optimized',
  'accelerated', 'developed', 'deployed', 'implemented', 'designed', 'built', 'reduced',
  'increased', 'scaled', 'automated', 'delivered', 'mentored', 'established', 'generated',
  'maximized', 'transformed', 'executed', 'championed', 'pioneered', 'formulated', 'led',
  'authored', 'directed', 'expanded', 'negotiated', 'launched', 'captured'
];

const WEAK_PASSIVE_VERBS = [
  'worked on', 'helped with', 'responsible for', 'handled', 'assisted with', 'participated in',
  'involved with', 'did', 'tried to', 'tasked with', 'attempted'
];

// Acronym and synonym mappings for semantic matching in resumes
const ACRONYM_SYNONYMS: Record<string, string[]> = {
  prd: ['product requirement document', 'product requirements document', 'product requirement documents', 'prds'],
  'p&l': ['profit and loss', 'profit & loss', 'p and l', 'p&l accountability', 'p&l responsibility'],
  gtm: ['go-to-market', 'go to market', 'gtm strategy', 'gtm partner'],
  coe: ['center of excellence', 'centers of excellence', 'coes'],
  sdlc: ['software development life cycle', 'software development lifecycle'],
  pdlc: ['product development life cycle', 'product development lifecycle'],
  ai: ['artificial intelligence', 'generative ai', 'ai-first', 'machine learning'],
  ml: ['machine learning', 'artificial intelligence'],
  finops: ['cloud financial operations', 'cloud economics', 'cloud cost optimization'],
  cicd: ['continuous integration', 'ci/cd', 'continuous delivery', 'deployment pipelines'],
  iot: ['internet of things', 'connected devices'],
  roi: ['return on investment'],
  kpi: ['key performance indicator', 'key performance indicators', 'kpis'],
};

function isKeywordInResume(keyword: string, lowerResume: string): boolean {
  const cleanKw = keyword.toLowerCase().trim();
  if (!cleanKw) return false;

  // Direct regex word boundary match
  const escaped = escapeRegExp(cleanKw);
  if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowerResume)) {
    return true;
  }

  // Check acronym synonyms
  const synonyms = ACRONYM_SYNONYMS[cleanKw.replace(/[^a-z0-9&]/g, '')];
  if (synonyms) {
    for (const syn of synonyms) {
      if (lowerResume.includes(syn)) return true;
    }
  }

  // Check plural/singular forms
  if (cleanKw.endsWith('s') && cleanKw.length > 3) {
    const singular = cleanKw.slice(0, -1);
    if (new RegExp(`\\b${escapeRegExp(singular)}\\b`, 'i').test(lowerResume)) {
      return true;
    }
  } else {
    const plural = `${cleanKw}s`;
    if (new RegExp(`\\b${escapeRegExp(plural)}\\b`, 'i').test(lowerResume)) {
      return true;
    }
  }

  return false;
}

export function extractJobKeywords(jdText: string, resumeText: string = ''): ExtractedKeyword[] {
  if (!jdText || !jdText.trim()) return [];

  const lowerJD = jdText.toLowerCase();
  const lowerResume = resumeText.toLowerCase();
  const extracted: ExtractedKeyword[] = [];
  const seenKeywords = new Set<string>();

  // 1. Extract known technical and domain skills
  for (const skill of COMMON_SKILLS) {
    const skillLower = skill.toLowerCase();
    let isMatched = false;

    // Special safety rule for single short words like 'Go'
    if (skillLower === 'go') {
      isMatched = /\b(golang|go\s+programming|go\s+developer|go\s+language)\b/i.test(jdText) ||
                  /\bGo\b/.test(jdText) && /\b(Docker|Kubernetes|Python|Java|C\+\+|Rust)\b/.test(jdText);
    } else {
      const pattern = new RegExp(`\\b${escapeRegExp(skillLower)}\\b`, 'i');
      isMatched = pattern.test(lowerJD);
    }

    if (isMatched && !seenKeywords.has(skillLower)) {
      seenKeywords.add(skillLower);
      const count = (lowerJD.match(new RegExp(`\\b${escapeRegExp(skillLower)}\\b`, 'gi')) || []).length;
      extracted.push({
        keyword: skill,
        category: 'hard_skill',
        count,
        foundInResume: isKeywordInResume(skill, lowerResume),
      });
    }
  }

function cleanExtractedTerm(term: string): string {
  return term
    .replace(/^(own|lead|drive|build|design|manage|serve|establish|oversee|scale|deliver|implement|develop|navigate)\s+/i, '')
    .trim();
}

  // 2. Extract multi-word capitalized domain concepts (e.g., "Product Requirement Documents", "Cloud Adoption", "Global Compliance")
  const lines = jdText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•\d.)]\s*/, '');
    const trimmedLower = trimmed.toLowerCase();

    // Skip section headers and blocklisted phrases
    if (SECTION_HEADER_BLOCKLIST.has(trimmedLower) || Array.from(SECTION_HEADER_BLOCKLIST).some((h) => trimmedLower === h || trimmedLower.startsWith(h))) {
      continue;
    }

    // Look for bracketed acronyms e.g. "Product Requirement Documents (PRDs)"
    const acronymMatches = trimmed.match(/([A-Z][a-zA-Z\s]{3,35})\s*\(([A-Z0-9&]{2,6})\)/g);
    if (acronymMatches) {
      for (const m of acronymMatches) {
        const clean = cleanExtractedTerm(m);
        const cleanLower = clean.toLowerCase();
        if (!seenKeywords.has(cleanLower) && !SECTION_HEADER_BLOCKLIST.has(cleanLower)) {
          seenKeywords.add(cleanLower);
          extracted.push({
            keyword: clean,
            category: 'qualification',
            count: 1,
            foundInResume: isKeywordInResume(clean, lowerResume),
          });
        }
      }
    }

    // Look for capitalized noun phrases (2-4 words) that are not full sentences
    const phraseMatches = trimmed.match(/\b([A-Z][a-zA-Z0-9-]+\s+[A-Z][a-zA-Z0-9-]+(?:\s+[A-Z][a-zA-Z0-9-]+)?)\b/g);
    if (phraseMatches) {
      for (const phrase of phraseMatches) {
        const cleanPhrase = cleanExtractedTerm(phrase);
        const phraseLower = cleanPhrase.toLowerCase();

        if (
          !SECTION_HEADER_BLOCKLIST.has(phraseLower) &&
          !Array.from(SECTION_HEADER_BLOCKLIST).some((h) => phraseLower.startsWith(h)) &&
          !seenKeywords.has(phraseLower) &&
          cleanPhrase.length >= 6 &&
          cleanPhrase.length <= 40
        ) {
          seenKeywords.add(phraseLower);
          extracted.push({
            keyword: cleanPhrase,
            category: 'qualification',
            count: 1,
            foundInResume: isKeywordInResume(cleanPhrase, lowerResume),
          });
        }
      }
    }
  }

  return extracted.sort((a, b) => b.count - a.count).slice(0, 20);
}

export function calculateATSScore(resumeText: string, jdText: string): ATSScoreBreakdown {
  if (!resumeText.trim() || !jdText.trim()) {
    return {
      overallScore: 0,
      keywordMatchScore: 0,
      skillsMatchScore: 0,
      actionVerbScore: 0,
      formattingScore: 0,
      brevityScore: 0,
      matchedKeywords: [],
      missingKeywords: [],
      matchedSkills: [],
      missingSkills: [],
      strongVerbsCount: 0,
      weakVerbsFound: [],
      clichesFound: [],
    };
  }

  const lowerResume = resumeText.toLowerCase();
  const jdKeywords = extractJobKeywords(jdText, resumeText);
  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const item of jdKeywords) {
    if (item.foundInResume) {
      matchedKeywords.push(item.keyword);
    } else {
      missingKeywords.push(item.keyword);
    }
  }

  const totalKeywords = jdKeywords.length || 1;
  const keywordMatchScore = Math.min(100, Math.round((matchedKeywords.length / totalKeywords) * 100));
  const skillsMatchScore = keywordMatchScore;

  let strongVerbsCount = 0;
  for (const verb of STRONG_ACTION_VERBS) {
    const count = (lowerResume.match(new RegExp(`\\b${verb}\\b`, 'gi')) || []).length;
    strongVerbsCount += count;
  }

  const weakVerbsFound: string[] = [];
  for (const weak of WEAK_PASSIVE_VERBS) {
    if (lowerResume.includes(weak)) {
      weakVerbsFound.push(weak);
    }
  }

  let actionVerbScore = Math.min(100, strongVerbsCount * 15);
  actionVerbScore = Math.max(10, actionVerbScore - weakVerbsFound.length * 10);

  let formattingScore = 50;
  if (/experience|work history|employment/i.test(resumeText)) formattingScore += 15;
  if (/education|degree|university/i.test(resumeText)) formattingScore += 15;
  if (/skills|technologies|technical expertise/i.test(resumeText)) formattingScore += 10;
  if (/profile|summary|executive/i.test(resumeText)) formattingScore += 10;
  formattingScore = Math.min(100, formattingScore);

  const metricMatches = (resumeText.match(/(\d+%\s*|\$\d+|\d+\+?\s*(years|engineers|users|clients|ms|x|services|projects|teams|portfolio|revenue))/gi) || []).length;
  let brevityScore = Math.min(100, 40 + metricMatches * 12);

  const overallScore = Math.round(
    keywordMatchScore * 0.45 +
    actionVerbScore * 0.25 +
    formattingScore * 0.15 +
    brevityScore * 0.15
  );

  return {
    overallScore,
    keywordMatchScore,
    skillsMatchScore,
    actionVerbScore,
    formattingScore,
    brevityScore,
    matchedKeywords,
    missingKeywords,
    matchedSkills: matchedKeywords,
    missingSkills: missingKeywords,
    strongVerbsCount,
    weakVerbsFound,
    clichesFound: [],
  };
}

// Full LLM-driven ATS evaluation: keywords extraction, semantic resume matching, scoring, and targeted suggestions
export async function evaluateATSWithLLM(
  resumeText: string,
  jdText: string,
  config: LLMConfig
): Promise<{
  score: ATSScoreBreakdown;
  keywords: ExtractedKeyword[];
  suggestions: Suggestion[];
}> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const systemPrompt = `You are a world-class ATS Resume Evaluation Specialist.
Analyze the provided candidate's Resume against the Job Description (JD).
Your task is to:
1. Extract 10-18 critical, high-signal target skills, tools, domain methodologies, and leadership responsibilities from the JD.
   CRITICAL: NEVER extract generic section headers like "Responsibilities", "About the Job", "Minimum qualifications", "Preferred qualifications", "Qualifications", or "Overview".
2. Check if each extracted skill/keyword is present in the candidate's resume (use semantic matching for abbreviations e.g. PRD = Product Requirement Document, P&L = Profit & Loss).
3. Compute ATS scores:
   - keywordMatchScore: percentage of JD keywords matched in resume (0-100)
   - actionVerbScore: strength and frequency of active power verbs (0-100)
   - formattingScore: clear sections, readable hierarchy (0-100)
   - brevityScore: metrics, numbers, ROI, and concise impact (0-100)
   - overallScore: weighted score (keywordMatch 45%, verbs 25%, formatting 15%, brevity 15%)
4. Generate 3-6 prioritized, high-impact suggestions focusing on MISSING skills, with tailored reference snippets that the candidate can adapt into their resume.

Return ONLY a valid JSON object matching this exact schema:
{
  "overallScore": number,
  "keywordMatchScore": number,
  "actionVerbScore": number,
  "formattingScore": number,
  "brevityScore": number,
  "keywords": [
    {
      "keyword": "string",
      "category": "hard_skill" | "soft_skill" | "qualification" | "domain",
      "foundInResume": boolean
    }
  ],
  "suggestions": [
    {
      "id": "string",
      "category": "ats_keyword" | "action_verbs" | "brevity_cliche" | "structure_formatting",
      "title": "string",
      "description": "string",
      "impact": "high" | "medium" | "low",
      "targetSection": "string",
      "referenceSnippet": "string"
    }
  ]
}`;

  const userPrompt = `JOB DESCRIPTION:\n${jdText}\n\nCANDIDATE RESUME:\n${resumeText}\n\nPerform comprehensive ATS evaluation and return JSON.`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM ATS evaluation failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  let parsed: any = null;

  const jsonArrMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
  const jsonObjMatch = content.match(/\{[\s\S]*\}/);

  if (jsonArrMatch) {
    parsed = JSON.parse(jsonArrMatch[0]);
  } else if (jsonObjMatch) {
    parsed = JSON.parse(jsonObjMatch[0]);
  }

  if (parsed) {
    const rawSuggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);
    const rawKeywords = Array.isArray(parsed) ? [] : (parsed.keywords || []);

    const keywords: ExtractedKeyword[] = rawKeywords.length > 0
      ? rawKeywords.map((k: any) => ({
          keyword: k.keyword,
          category: k.category || 'hard_skill',
          count: 1,
          foundInResume: Boolean(k.foundInResume),
        }))
      : extractJobKeywords(jdText, resumeText);

    const matchedKeywords = keywords.filter((k) => k.foundInResume).map((k) => k.keyword);
    const missingKeywords = keywords.filter((k) => !k.foundInResume).map((k) => k.keyword);

    const localFallbackScore = calculateATSScore(resumeText, jdText);

    const score: ATSScoreBreakdown = {
      overallScore: Number(parsed.overallScore) || localFallbackScore.overallScore,
      keywordMatchScore: Number(parsed.keywordMatchScore) || localFallbackScore.keywordMatchScore,
      skillsMatchScore: Number(parsed.keywordMatchScore) || localFallbackScore.skillsMatchScore,
      actionVerbScore: Number(parsed.actionVerbScore) || localFallbackScore.actionVerbScore,
      formattingScore: Number(parsed.formattingScore) || localFallbackScore.formattingScore,
      brevityScore: Number(parsed.brevityScore) || localFallbackScore.brevityScore,
      matchedKeywords,
      missingKeywords,
      matchedSkills: matchedKeywords,
      missingSkills: missingKeywords,
      strongVerbsCount: 8,
      weakVerbsFound: [],
      clichesFound: [],
    };

    const suggestions: Suggestion[] = rawSuggestions.map((s: any, idx: number) => ({
      id: s.id || `sugg-llm-${idx}-${Date.now()}`,
      category: s.category || 'ats_keyword',
      title: s.title || 'Optimization Suggestion',
      description: s.description || '',
      impact: s.impact || 'high',
      targetSection: s.targetSection || 'Experience',
      referenceSnippet: s.referenceSnippet || '',
      status: 'pending',
    }));

    return { score, keywords, suggestions };
  }

  throw new Error('Could not parse JSON response from LLM');
}

export async function generateOptimizationSuggestions(
  resumeText: string,
  jdText: string,
  llmConfig?: LLMConfig
): Promise<Suggestion[]> {
  if (!resumeText.trim() || !jdText.trim()) return [];

  if (llmConfig && llmConfig.apiKey) {
    const result = await evaluateATSWithLLM(resumeText, jdText, llmConfig);
    return result.suggestions;
  }

  // Local fallback based on detected missing keywords
  const score = calculateATSScore(resumeText, jdText);
  const suggestions: Suggestion[] = [];

  for (const kw of score.missingKeywords.slice(0, 5)) {
    suggestions.push({
      id: `kw-${kw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      category: 'ats_keyword',
      title: `Incorporate Missing Keyword: ${kw}`,
      description: `The Job Description prioritizes "${kw}". Incorporate this skill or experience into your professional bullet points.`,
      impact: 'high',
      targetSection: 'Skills & Experience',
      referenceSnippet: `Demonstrated leadership applying ${kw} to deliver high-impact enterprise digital solutions.`,
      status: 'pending',
    });
  }

  if (score.weakVerbsFound.length > 0) {
    for (const weak of score.weakVerbsFound) {
      suggestions.push({
        id: `verb-${weak.replace(/\s+/g, '-')}`,
        category: 'action_verbs',
        title: `Replace Passive Phrase: "${weak}"`,
        description: `Replace passive phrase "${weak}" with high-impact power verbs and measurable results.`,
        impact: 'medium',
        targetSection: 'Experience',
        referenceSnippet: `Architected and delivered core modules, improving system performance and reliability.`,
        status: 'pending',
      });
    }
  } else if (score.actionVerbScore < 85) {
    suggestions.push({
      id: 'verb-quantify',
      category: 'action_verbs',
      title: 'Strengthen Achievements with Action Verbs & Metrics',
      description: 'Begin bullet points with active power verbs and quantify business impact.',
      impact: 'medium',
      targetSection: 'Experience',
      referenceSnippet: 'Engineered and scaled distributed services, reducing latency by 35% across critical endpoints.',
      status: 'pending',
    });
  }

  return suggestions;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
