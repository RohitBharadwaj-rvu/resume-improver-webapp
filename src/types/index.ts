export type SuggestionCategory = 
  | 'ats_keyword'
  | 'action_verbs'
  | 'brevity_cliche'
  | 'structure_formatting'
  | 'grammar_tone';

export type SuggestionStatus = 'pending' | 'accepted' | 'ignored';

export interface Suggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  targetSection?: string;
  referenceSnippet: string;
  humanizedSnippet?: string;
  status: SuggestionStatus;
  userNotes?: string;
}

export interface ATSScoreBreakdown {
  overallScore: number;
  keywordMatchScore: number;
  skillsMatchScore: number;
  actionVerbScore: number;
  formattingScore: number;
  brevityScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  strongVerbsCount: number;
  weakVerbsFound: string[];
  clichesFound: string[];
}

export interface ExtractedKeyword {
  keyword: string;
  category: 'hard_skill' | 'soft_skill' | 'tool' | 'qualification' | 'domain';
  count: number;
  foundInResume: boolean;
}

export interface DetectedCliche {
  phrase: string;
  reason: string;
  replacement: string;
}

export interface HumanizerResult {
  original: string;
  humanized: string;
  aiConfidenceScore: number;
  detectedCliches: DetectedCliche[];
  explanation: string;
}

export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  provider?: 'openai' | 'openrouter' | 'ollama' | 'lmstudio' | 'groq' | 'custom';
}
