import type { HumanizerResult, DetectedCliche, LLMConfig } from '../types';

const AI_CLICHES_DATABASE: { phrase: RegExp; reason: string; replacement: string }[] = [
  {
    phrase: /\bspearheaded\b/gi,
    reason: 'Overused AI buzzword often flagged by recruiters as boilerplate.',
    replacement: 'Led',
  },
  {
    phrase: /\bseamlessly\b/gi,
    reason: 'Vague AI filler word that adds no concrete evidence.',
    replacement: 'directly / reliably',
  },
  {
    phrase: /\btestament to\b/gi,
    reason: 'ChatGPT rhetorical trope; state achievements directly.',
    replacement: 'demonstrating',
  },
  {
    phrase: /\bdelve(d|s|ing)? into\b/gi,
    reason: 'High-frequency AI tell rarely used in authentic professional engineering contexts.',
    replacement: 'analyzed / built',
  },
  {
    phrase: /\bcutting-edge\b/gi,
    reason: 'Generic corporate buzzword. Name the specific technology instead.',
    replacement: 'modern',
  },
  {
    phrase: /\bmultifaceted\b/gi,
    reason: 'Abstract adjective. Specify the concrete responsibilities.',
    replacement: 'end-to-end',
  },
  {
    phrase: /\btapestry\b/gi,
    reason: 'Poetic AI cliché unsuitable for professional resumes.',
    replacement: 'suite / ecosystem',
  },
  {
    phrase: /\bleverage(d|s|ing)?\b/gi,
    reason: 'Jargon-heavy filler. Use direct action verbs like "used", "applied", or "built with".',
    replacement: 'used / built with',
  },
  {
    phrase: /\bsynergy\b/gi,
    reason: 'Overdone corporate buzzword.',
    replacement: 'collaboration',
  },
  {
    phrase: /\bbest-in-class\b/gi,
    reason: 'Unsubstantiated superlative. Provide actual performance metrics instead.',
    replacement: 'high-performance',
  },
  {
    phrase: /\bholistic approach\b/gi,
    reason: 'Vague claim. Detail the specific methodology applied.',
    replacement: 'comprehensive process',
  },
  {
    phrase: /\bdriving impactful results\b/gi,
    reason: 'Fluff phrase. State the specific business or technical metric improved.',
    replacement: 'improving system performance',
  },
];

export function detectAITone(text: string): { aiConfidenceScore: number; detectedCliches: DetectedCliche[] } {
  if (!text || text.trim().length === 0) {
    return { aiConfidenceScore: 0, detectedCliches: [] };
  }

  const detectedCliches: DetectedCliche[] = [];
  let clichéWeight = 0;

  for (const item of AI_CLICHES_DATABASE) {
    const matches = text.match(item.phrase);
    if (matches && matches.length > 0) {
      detectedCliches.push({
        phrase: matches[0],
        reason: item.reason,
        replacement: item.replacement,
      });
      clichéWeight += matches.length * 20;
    }
  }

  const hasMetrics = /\d+%|\$\d+|\d+\s*(ms|x|users|engineers|services)/i.test(text);
  if (!hasMetrics && text.length > 80) {
    clichéWeight += 15;
  }

  const aiConfidenceScore = Math.min(95, Math.max(10, clichéWeight));

  return {
    aiConfidenceScore,
    detectedCliches,
  };
}

export async function humanizeText(
  text: string,
  context?: string,
  llmConfig?: LLMConfig
): Promise<HumanizerResult> {
  const { aiConfidenceScore, detectedCliches } = detectAITone(text);

  if (llmConfig && llmConfig.apiKey) {
    try {
      const llmResult = await callLLMHumanizer(text, context, llmConfig);
      if (llmResult) {
        return {
          original: text,
          humanized: llmResult.humanized,
          aiConfidenceScore: Math.min(aiConfidenceScore, 85),
          detectedCliches,
          explanation: llmResult.explanation,
        };
      }
    } catch (err) {
      console.error('LLM Humanizer failed:', err);
      throw err;
    }
  }

  let humanized = text;
  for (const item of detectedCliches) {
    const regex = new RegExp(`\\b${escapeRegExp(item.phrase)}\\b`, 'gi');
    const replacement = item.replacement.split('/')[0].trim();
    humanized = humanized.replace(regex, replacement);
  }

  humanized = humanized.replace(/\s+/g, ' ').trim();

  return {
    original: text,
    humanized,
    aiConfidenceScore,
    detectedCliches,
    explanation: detectedCliches.length > 0
      ? `Replaced ${detectedCliches.length} detected AI cliché(s) with direct action verbs.`
      : 'Text uses clear, natural phrasing.',
  };
}

async function callLLMHumanizer(
  text: string,
  context?: string,
  config?: LLMConfig
): Promise<{ humanized: string; explanation: string } | null> {
  if (!config) return null;

  const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const systemPrompt = `You are a professional resume editor specializing in eliminating ChatGPT/AI tells, corporate fluff, and robotic buzzwords.
Rewrite the provided resume snippet so it sounds 100% natural, active, authentic, and written by an experienced human engineer.
Do NOT fabricate new achievements. Keep the user's authentic facts and make them crisp and active.

Return JSON in this format:
{
  "humanized": "string",
  "explanation": "string"
}`;

  const userPrompt = `TEXT TO HUMANIZE:\n${text}\n${context ? `\nCONTEXT / TARGET ROLE:\n${context}` : ''}`;

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
    throw new Error(`Humanizer LLM request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  return null;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
