import { describe, it, expect, vi } from 'vitest';
import { calculateATSScore, extractJobKeywords, generateOptimizationSuggestions } from '../atsEngine';
import type { LLMConfig } from '../../types';

describe('ATS Engine', () => {
  const sampleJD = `
    Senior Full Stack Engineer
    Requirements:
    - 5+ years of experience with React, TypeScript, and Node.js
    - Experience building scalable REST APIs and GraphQL microservices
    - Proficiency with PostgreSQL, Redis, and Docker in AWS cloud
    - Strong knowledge of CI/CD pipelines, Jest testing, and agile methodologies
    - Excellent communication and leadership skills
  `;

  const sampleWeakResume = `
    Software Developer
    Summary: Hard working developer responsible for coding websites and helping team.
    Experience:
    - Worked on various web applications using JavaScript and HTML/CSS.
    - Helped with database queries and bug fixes.
    - Handled customer requests and participated in daily meetings.
  `;

  const sampleStrongResume = `
    Senior Full Stack Software Engineer
    Summary: Results-driven engineer with 6 years of expertise architecting high-performance web platforms using React, TypeScript, Node.js, and AWS.
    Experience:
    - Architected and deployed 15+ scalable GraphQL microservices and REST APIs in Node.js and TypeScript, reducing latency by 35%.
    - Designed relational data models in PostgreSQL and caching layers with Redis, improving database throughput by 50%.
    - Implemented automated CI/CD deployment pipelines using Docker and GitHub Actions with 95% Jest test coverage.
    - Spearheaded agile sprint planning and mentored junior engineers to accelerate delivery velocity by 25%.
  `;

  it('extracts key skills, tools, and requirements from Job Description', () => {
    const keywords = extractJobKeywords(sampleJD, sampleWeakResume);
    expect(keywords.length).toBeGreaterThan(0);
    const keywordNames = keywords.map(k => k.keyword.toLowerCase());
    expect(keywordNames).toContain('react');
    expect(keywordNames).toContain('typescript');
    expect(keywordNames).toContain('postgresql');
  });

  it('calculates lower ATS score for weak resume missing key requirements', () => {
    const score = calculateATSScore(sampleWeakResume, sampleJD);
    expect(score.overallScore).toBeLessThan(60);
    expect(score.missingKeywords.length).toBeGreaterThan(0);
    expect(score.missingKeywords.map(k => k.toLowerCase())).toContain('typescript');
    expect(score.missingKeywords.map(k => k.toLowerCase())).toContain('react');
  });

  it('calculates high ATS score (>85%) for tailored resume containing strong action verbs and keywords', () => {
    const score = calculateATSScore(sampleStrongResume, sampleJD);
    expect(score.overallScore).toBeGreaterThanOrEqual(85);
    expect(score.keywordMatchScore).toBeGreaterThanOrEqual(80);
    expect(score.actionVerbScore).toBeGreaterThanOrEqual(80);
    expect(score.matchedKeywords.length).toBeGreaterThan(5);
  });

  it('generates prioritized optimization suggestions with tailored reference snippets', async () => {
    const suggestions = await generateOptimizationSuggestions(sampleWeakResume, sampleJD);
    expect(suggestions.length).toBeGreaterThan(0);
    
    const keywordSuggestion = suggestions.find(s => s.category === 'ats_keyword');
    expect(keywordSuggestion).toBeDefined();
    expect(keywordSuggestion?.referenceSnippet).toBeTruthy();

    const verbSuggestion = suggestions.find(s => s.category === 'action_verbs');
    expect(verbSuggestion).toBeDefined();
  });

  it('invokes OpenAI-compatible LLM endpoint when apiKey is configured', async () => {
    const mockLLMConfig: LLMConfig = {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-mock-key',
      model: 'gpt-4o',
    };

    const mockResponsePayload = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                id: 'llm-sugg-1',
                category: 'ats_keyword',
                title: 'Add GraphQL Microservices Experience',
                description: 'The JD requires GraphQL experience.',
                impact: 'high',
                targetSection: 'Experience',
                referenceSnippet: 'Engineered GraphQL microservices with Apollo Server.',
              },
            ]),
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponsePayload,
    } as any);

    const suggestions = await generateOptimizationSuggestions(sampleWeakResume, sampleJD, mockLLMConfig);
    
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-mock-key',
        }),
      })
    );

    expect(suggestions.length).toBe(1);
    expect(suggestions[0].title).toBe('Add GraphQL Microservices Experience');

    fetchSpy.mockRestore();
  });
});
