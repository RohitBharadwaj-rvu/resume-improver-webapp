import type { LLMConfig } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachContext {
  suggestionTitle: string;
  targetSection: string;
  referenceSnippet: string;
  jdText: string;
  resumeText: string;
}

export async function chatWithSuggestionCoach(
  messages: { role: 'user' | 'assistant'; content: string }[],
  context: CoachContext,
  config?: LLMConfig
): Promise<{ reply: string; revisedSnippet?: string }> {
  const systemPrompt = `You are an elite executive resume coach and ATS optimization strategist.
The candidate is discussing a specific resume suggestion with you:
- Suggestion Focus: ${context.suggestionTitle}
- Target Section: ${context.targetSection}
- Starting Reference Snippet: "${context.referenceSnippet}"
- Job Description Context:
${context.jdText ? context.jdText.slice(0, 1200) : 'General executive/tech role.'}

YOUR GOAL:
1. Actively listen to the candidate's actual accomplishments, metrics, tech stack, and preferences.
2. Answer their questions and coach them on how to frame their real experience compellingly for this role.
3. Whenever you propose or refine a resume bullet point, enclose the exact bullet point between these markers:
<<<REVISED_SNIPPET>>>
[Your revised bullet point here]
<<<END_REVISED_SNIPPET>>>
Keep the bullet concise, action-driven, quantified, and tailored to the job description.
4. Keep your conversational responses concise (2-4 sentences) and professional.`;

  if (config && config.apiKey) {
    const url = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Chat coach failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'I could not generate a response. Please check your API settings.';

    const snippetMatch = reply.match(/<<<REVISED_SNIPPET>>>([\s\S]*?)<<<END_REVISED_SNIPPET>>>/);
    const revisedSnippet = snippetMatch ? snippetMatch[1].trim().replace(/^["']|["']$/g, '') : undefined;
    const cleanReply = reply.replace(/<<<REVISED_SNIPPET>>>[\s\S]*?<<<END_REVISED_SNIPPET>>>/g, '').trim();

    return {
      reply: cleanReply || reply,
      revisedSnippet,
    };
  }

  // Local fallback response when no API key is set
  const lastUserMsg = messages[messages.length - 1]?.content.toLowerCase() || '';
  let adapted = context.referenceSnippet;
  let replyText = `I understand you'd like to tailor this. `;

  if (lastUserMsg.includes('metric') || lastUserMsg.includes('number') || lastUserMsg.includes('%') || lastUserMsg.includes('$')) {
    adapted = `${context.referenceSnippet.replace(/\.+$/, '')}, delivering $1.5M+ in cost savings and 30% speed improvement across enterprise operations.`;
    replyText += `I've incorporated measurable metrics to highlight your direct business impact.`;
  } else if (lastUserMsg.includes('executive') || lastUserMsg.includes('lead') || lastUserMsg.includes('strategy')) {
    adapted = `Spearheaded executive ${context.suggestionTitle.replace(/^Incorporate Missing Keyword:\s*/i, '')} roadmap, aligning cross-functional VP stakeholders and engineering teams to accelerate digital adoption.`;
    replyText += `I've elevated the tone to emphasize executive leadership and cross-functional stakeholder alignment.`;
  } else {
    adapted = `Applied ${context.suggestionTitle.replace(/^Incorporate Missing Keyword:\s*/i, '')} across core initiatives, streamlining delivery and accelerating time-to-market.`;
    replyText += `Here is an adapted version tailored to your discussion. You can connect your OpenAI/OpenRouter API in Settings for full interactive LLM coaching.`;
  }

  return {
    reply: replyText,
    revisedSnippet: adapted,
  };
}
