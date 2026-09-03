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
  if (!jdText || !jdText.trim()) return [];

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
    if (trimmed.length > 3 && trimmed.length < 50 && /^[A-Z]/.test(trimmed)) {
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

  let actionVerbScore = Math.min(100, strongVerbsCount * 20);
  actionVerbScore = Math.max(10, actionVerbScore - weakVerbsFound.length * 15);

  let formattingScore = 40;
  if (/experience|work history|employment/i.test(resumeText)) formattingScore += 20;
  if (/education|degree|university/i.test(resumeText)) formattingScore += 20;
  if (/skills|technologies|technical expertise/i.test(resumeText)) formattingScore += 10;
  if (/summary|profile|about/i.test(resumeText)) formattingScore += 10;
  formattingScore = Math.min(100, formattingScore);

  const metricMatches = (resumeText.match(/(\d+%\s*|\$\d+|\d+\+?\s*(years|engineers|users|clients|ms|x|services|projects|teams))/gi) || []).length;
  let brevityScore = Math.min(100, 30 + metricMatches * 15);

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
  if (!resumeText.trim() || !jdText.trim()) {
    return [];
  }

  // 1. If LLM API is configured, use LLM exclusively to generate dynamic suggestions
  if (llmConfig && llmConfig.apiKey) {
    try {
      const llmSuggestions = await callLLMSuggestions(resumeText, jdText, llmConfig);
      if (llmSuggestions && llmSuggestions.length > 0) {
        return llmSuggestions;
      }
    } catch (err) {
      console.error('LLM API suggestion call failed:', err);
      throw err;
    }
  }

  // 2. If no LLM API is configured, dynamically generate suggestions based strictly on detected missing keywords
  const score = calculateATSScore(resumeText, jdText);
  const suggestions: Suggestion[] = [];

  // Missing Keywords suggestions dynamically built from actual missing JD keywords
  if (score.missingKeywords.length > 0) {
    for (const kw of score.missingKeywords.slice(0, 5)) {
      suggestions.push({
        id: `kw-${kw.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        category: 'ats_keyword',
        title: `Add Missing Keyword: ${kw}`,
        description: `The Job Description requires "${kw}". Incorporate this keyword into your relevant project experience or skills list.`,
        impact: 'high',
        targetSection: 'Skills & Experience',
        referenceSnippet: `Applied ${kw} to build and optimize scalable solutions according to project requirements.`,
        status: 'pending',
      });
    }
  }

  // Weak Verbs dynamically detected in the user's resume
  if (score.weakVerbsFound.length > 0) {
    for (const weak of score.weakVerbsFound) {
      suggestions.push({
        id: `verb-${weak.replace(/\s+/g, '-')}`,
        category: 'action_verbs',
        title: `Replace Passive Phrase: "${weak}"`,
        description: `Replace "${weak}" with active action verbs (e.g., Engineered, Optimized, Delivered) and quantify your result.`,
        impact: 'medium',
        targetSection: 'Experience',
        referenceSnippet: `Engineered and delivered core features, improving system performance and reliability.`,
        status: 'pending',
      });
    }
  }

  return suggestions;
}

async function callLLMSuggestions(
  resumeText: string,
  jdText: string,
  config: LLMConfig
): Promise<Suggestion[]> {
  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const systemPrompt = `You are an elite ATS resume optimization consultant. Analyze the candidate's actual resume text against the target Job Description.
Generate specific, actionable suggestions targeting >95% ATS suitability based strictly on the provided resume and JD.
For each suggestion, provide:
- id: unique string
- category: "ats_keyword" | "action_verbs" | "brevity_cliche" | "structure_formatting" | "grammar_tone"
- title: concise title
- description: clear reason why this improves the ATS score
- impact: "high" | "medium" | "low"
- targetSection: section where change should be made
- referenceSnippet: tailored example snippet matching the JD requirements for the user to adapt with their own history.

Return ONLY a valid JSON array of objects.`;

  const userPrompt = `JOB DESCRIPTION:\n${jdText}\n\nRESUME:\n${resumeText}\n\nAnalyze and provide ATS optimization suggestions in JSON format.`;

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
    const errorText = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonMatch) {
    const rawSuggestions = JSON.parse(jsonMatch[0]);
    return rawSuggestions.map((s: any, idx: number) => ({
      id: s.id || `sugg-llm-${idx}-${Date.now()}`,
      category: s.category || 'ats_keyword',
      title: s.title || 'Optimization Suggestion',
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
