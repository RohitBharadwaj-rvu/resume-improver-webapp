import { describe, it, expect, vi } from 'vitest';
import { detectAITone, humanizeText } from '../humanizer';
import type { LLMConfig } from '../../types';

describe('Humanizer Engine', () => {
  const sampleAIText = `
    Spearheaded cutting-edge initiatives to seamlessly orchestrate cross-functional synergy. 
    It is a testament to our commitment to delve into multifaceted paradigms and leverage best-in-class solutions.
  `;

  const sampleNaturalText = `
    Led the migration of 4 legacy backend services to Go, reducing cloud hosting costs by 22% and improving response times by 120ms.
  `;

  it('detects corporate AI buzzwords and clichés', () => {
    const analysis = detectAITone(sampleAIText);
    expect(analysis.aiConfidenceScore).toBeGreaterThan(60);
    expect(analysis.detectedCliches.length).toBeGreaterThan(0);
    
    const phrases = analysis.detectedCliches.map(c => c.phrase.toLowerCase());
    expect(phrases.some(p => p.includes('spearheaded') || p.includes('seamlessly') || p.includes('testament') || p.includes('delve') || p.includes('cutting-edge'))).toBe(true);
  });

  it('rates natural, metric-driven human text with low AI confidence score', () => {
    const analysis = detectAITone(sampleNaturalText);
    expect(analysis.aiConfidenceScore).toBeLessThan(35);
    expect(analysis.detectedCliches.length).toBeLessThanOrEqual(1);
  });

  it('produces humanized rewrites with cliché replacements and active voice', async () => {
    const result = await humanizeText(sampleAIText);
    expect(result.humanized).toBeTruthy();
    expect(result.humanized).not.toEqual(sampleAIText);
    expect(result.detectedCliches.length).toBeGreaterThan(0);
    expect(result.explanation).toBeTruthy();
  });

  it('invokes OpenAI-compatible LLM endpoint for deep humanizing when configured', async () => {
    const mockLLMConfig: LLMConfig = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-mock-key',
      model: 'gpt-4o',
    };

    const mockResponsePayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              humanized: 'Led core initiatives to coordinate team efforts and deliver robust cloud solutions.',
              explanation: 'Replaced corporate clichés with active verbs.',
            }),
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponsePayload,
    } as any);

    const result = await humanizeText(sampleAIText, 'Senior Engineer', mockLLMConfig);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-mock-key',
        }),
      })
    );

    expect(result.humanized).toBe('Led core initiatives to coordinate team efforts and deliver robust cloud solutions.');
    expect(result.explanation).toBe('Replaced corporate clichés with active verbs.');

    fetchSpy.mockRestore();
  });
});
