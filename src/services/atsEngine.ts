import type { ATSScoreBreakdown, ExtractedKeyword, Suggestion, LLMConfig } from '../types';

const COMMON_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'CI/CD', 'Git', 'GitHub Actions', 'Jest', 'Vitest', 'Cypress', 'Tailwind CSS',
  'Next.js', 'Vue.js', 'Angular', 'Express', 'Django', 'Spring Boot', 'FastAPI', 'Microservices',
  'System Design', 'Agile', 'Scrum', 'Linux', 'DevOps', 'Terraform', 'Kafka', 'Elasticsearch'
];

const STRONG_ACTION_VERBS = [
  'architected', 'spearheaded', 'orchestrated', 'engineered', 'streamlined', 'optimized',
  'accelerated', 'developed', 'deployed', 'implemented', 'designed', 'built', 'reduced',
  'increased', 'scaled', 'automated', 'delivered', 'mentored', 'established', 'generated',
  'maximized', 'transformed', 'executed', 'championed', 'pioneered', 'formulated'
];

const WEAK_PASSIVE_VERBS = [
  'worked on', 'helped with', 'responsible for', 'handled', 'assisted with', 'participated in',
  'involved with', 'did', 'tried to', 'tasked with', 'attempted'
];

export function extractJobKeywords(jdText: string, resumeText: string = ''): ExtractedKeyword[] {
  if (!jdText) return [];

  const lowerJD = jdText.toLowerCase();
  const lowerResume = resumeText.toLowerCase();
  const extracted: ExtractedKeyword[] = [];

  for (const skill of COMMON_SKILLS) {
    const pattern = new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'i');
    if (pattern.test(lowerJD)) {
      const count = (lowerJD.match(new RegExp(`\\b${escapeRegExp(skill.toLowerCase())}\\b`, 'gi')) || []).length;
      extracted.push({
        keyword: skill,
        category: 'hard_skill',
        count,
        foundInResume: pattern.test(lowerResume),
      });
    }
  }

  const lines = jdText.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•\d.)]\s*/, '');
    if (trimmed.length > 5 && trimmed.length < 50 && /^[A-Z]/.test(trimmed)) {
      const cleanKeyword = trimmed.replace(/[:;,.]+$/, '');
      if (
        cleanKeyword.split(' ').length <= 4 &&
        !extracted.some((e) => e.keyword.toLowerCase() === cleanKeyword.toLowerCase())
      ) {
        const found = lowerResume.includes(cleanKeyword.toLowerCase());
        extracted.push({
          keyword: cleanKeyword,
          category: 'qualification',
          count: 1,
          foundInResume: found,
        });
      }
    }
  }

  return extracted.sort((a, b) => b.count - a.count);
}

export function calculateATSScore(resumeText: string, jdText: string): ATSScoreBreakdown {
  if (!resumeText || !jdText) {
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

  let actionVerbScore = Math.min(100, strongVerbsCount * 18);
  actionVerbScore = Math.max(10, actionVerbScore - weakVerbsFound.length * 15);

  let formattingScore = 50;
  if (/experience|work history|employment/i.test(resumeText)) formattingScore += 15;
  if (/education|degree|university/i.test(resumeText)) formattingScore += 15;
  if (/skills|technologies|technical expertise/i.test(resumeText)) formattingScore += 10;
  if (/summary|profile|about/i.test(resumeText)) formattingScore += 10;
  formattingScore = Math.min(100, formattingScore);

  const metricMatches = (resumeText.match(/(\d+%\s*|\$\d+|\d+\+?\s*(years|engineers|users|clients|ms|x|services|projects|teams))/gi) || []).length;
  let brevityScore = Math.min(100, 40 + metricMatches * 15);

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

export async function generateOptimizationSuggestions(
  resumeText: string,
  jdText: string,
  llmConfig?: LLMConfig
): Promise<Suggestion[]> {
  if (llmConfig && llmConfig.apiKey) {
    try {
      const llmSuggestions = await callLLMSuggestions(resumeText, jdText, llmConfig);
      if (llmSuggestions && llmSuggestions.length > 0) {
        return llmSuggestions;
      }
    } catch (err) {
      console.warn('LLM API suggestion call failed, falling back to deterministic engine:', err);
    }
  }

  const score = calculateATSScore(resumeText, jdText);
  const suggestions: Suggestion[] = [];

  if (score.missingKeywords.length > 0) {
    const topMissing = score.missingKeywords.slice(0, 4);
    for (const kw of topMissing) {
      suggestions.push({
        id: `ats-kw-${kw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        category: 'ats_keyword',
        title: `Integrate Missing Skill: ${kw}`,
        description: `The Job Description emphasizes "${kw}", but it was not detected in your resume. Incorporate it into your technical skills or project bullet points.`,
        impact: 'high',
        targetSection: 'Skills & Experience',
        referenceSnippet: `Demonstrated hands-on expertise in ${kw}, applying industry best practices to build robust and scalable systems.`,
        status: 'pending',
      });
    }
  }

  if (score.weakVerbsFound.length > 0) {
    for (const weak of score.weakVerbsFound) {
      suggestions.push({
        id: `verb-${weak.replace(/\s+/g, '-')}`,
        category: 'action_verbs',
        title: `Upgrade Passive Phrase: "${weak}"`,
        description: `Replace passive phrases like "${weak}" with high-impact power verbs paired with measurable outcomes.`,
        impact: 'medium',
        targetSection: 'Experience',
        referenceSnippet: `Architected and implemented core modules, improving reliability by 30% and reducing support tickets.`,
        status: 'pending',
      });
    }
  } else if (score.actionVerbScore < 85) {
    suggestions.push({
      id: 'verb-quantify-impact',
      category: 'action_verbs',
      title: 'Quantify Achievements with Measurable Metrics',
      description: 'Strengthen bullet points using the Google X-Y-Z formula: "Accomplished [X], as measured by [Y], by doing [Z]".',
      impact: 'high',
      targetSection: 'Experience',
      referenceSnippet: `Optimized system throughput by 45% by refactoring bottlenecks in database query execution and adding caching.`,
      status: 'pending',
    });
  }

  if (score.formattingScore < 90) {
    suggestions.push({
      id: 'struct-clarity',
      category: 'structure_formatting',
      title: 'Add Clear Section Headers for ATS Parsing',
      description: 'Ensure standard headers (Professional Experience, Technical Skills, Education, Professional Summary) are prominent.',
      impact: 'medium',
      targetSection: 'Header/Structure',
      referenceSnippet: `## Technical Skills\n- Languages: TypeScript, JavaScript, Python\n- Frameworks: React, Node.js, Express\n- Cloud & DevOps: Docker, AWS, CI/CD`,
      status: 'pending',
    });
  }

  suggestions.push({
    id: 'brevity-tailored',
    category: 'brevity_cliche',
    title: 'Tailor Executive Summary to Job Title',
    description: 'Align your opening summary with the specific requirements in the job description to immediately hook the recruiter.',
    impact: 'medium',
    targetSection: 'Professional Summary',
    referenceSnippet: `Results-driven Software Engineer with extensive experience in React, TypeScript, and distributed cloud services, proven track record delivering resilient full-stack applications.`,
    status: 'pending',
  });

  return suggestions;
}

async function callLLMSuggestions(
  resumeText: string,
  jdText: string,
  config: LLMConfig
): Promise<Suggestion[]> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const systemPrompt = `You are an elite ATS resume optimization consultant. Analyze the candidate's resume against the Job Description and return a JSON array of actionable suggestions targeting >95% ATS score.
Every suggestion MUST contain a realistic, tailored "referenceSnippet" that the candidate can adapt with their own authentic history.

Return ONLY a JSON array with objects matching:
{
  "id": "string",
  "category": "ats_keyword" | "action_verbs" | "brevity_cliche" | "structure_formatting" | "grammar_tone",
  "title": "string",
  "description": "string",
  "impact": "high" | "medium" | "low",
  "targetSection": "string",
  "referenceSnippet": "string"
}`;

  const userPrompt = `JOB DESCRIPTION:\n${jdText}\n\nCURRENT RESUME:\n${resumeText}\n\nGenerate high-impact ATS improvement suggestions.`;

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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed with status ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    const rawSuggestions = JSON.parse(jsonMatch[0]);
    return rawSuggestions.map((s: any, idx: number) => ({
      id: s.id || `sugg-llm-${idx}`,
      category: s.category || 'ats_keyword',
      title: s.title || 'Resume Optimization',
      description: s.description || '',
      impact: s.impact || 'medium',
      targetSection: s.targetSection || 'Experience',
      referenceSnippet: s.referenceSnippet || '',
      status: 'pending',
    }));
  }

  return [];
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
