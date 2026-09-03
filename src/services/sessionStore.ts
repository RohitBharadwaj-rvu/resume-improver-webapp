import type { ATSScoreBreakdown, Suggestion, LLMConfig } from '../types';

export interface SessionSnapshot {
  resumeHtml: string;
  resumeFileName: string;
  currentFilePath: string | null;
  jobDescription: string;
  atsBreakdown: ATSScoreBreakdown | null;
  suggestions: Suggestion[];
  llmConfig: LLMConfig;
  savedAt: number;
}

const STORAGE_KEY = 'resume_improver_session_snapshot';

export function saveSessionToLocalStorage(snapshot: SessionSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.error('Failed to save session snapshot to localStorage:', err);
  }
}

export function loadSessionFromLocalStorage(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error('Failed to load session snapshot from localStorage:', err);
    return null;
  }
}

export function clearSessionFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear session snapshot:', err);
  }
}
