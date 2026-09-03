import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { JobDescriptionPanel } from './components/JobDescriptionPanel';
import { DocumentEditor } from './components/DocumentEditor';
import { CompactATSHeader } from './components/CompactATSHeader';
import { SuggestionTabs } from './components/SuggestionTabs';
import { HumanizerModal } from './components/HumanizerModal';
import { SettingsModal } from './components/SettingsModal';
import { SuggestionDiscussModal } from './components/SuggestionDiscussModal';
import {
  calculateATSScore,
  extractJobKeywords,
  generateOptimizationSuggestions,
  evaluateATSWithLLM,
} from './services/atsEngine';
import { htmlToPlainText, generateDocxBlob } from './services/docManager';
import type { ATSScoreBreakdown, ExtractedKeyword, Suggestion, LLMConfig } from './types';
import confetti from 'canvas-confetti';
import saveAs from 'file-saver';
import { Trophy, AlertCircle } from 'lucide-react';

export function App() {
  const [resumeHtml, setResumeHtml] = useState('');
  const [resumeFileName, setResumeFileName] = useState('My_Resume.docx');
  const [jdText, setJdText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [atsBreakdown, setAtsBreakdown] = useState<ATSScoreBreakdown>({
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
  });

  const [extractedKeywords, setExtractedKeywords] = useState<ExtractedKeyword[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHumanizerOpen, setIsHumanizerOpen] = useState(false);
  const [humanizerInitialText, setHumanizerInitialText] = useState('');
  const [humanizerContextTitle, setHumanizerContextTitle] = useState('');
  const [discussingSuggestion, setDiscussingSuggestion] = useState<Suggestion | null>(null);
  const [isDiscussOpen, setIsDiscussOpen] = useState(false);

  const [llmConfig, setLlmConfig] = useState<LLMConfig>(() => {
    const saved = localStorage.getItem('resume_improver_llm_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return {
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4o',
      provider: 'openai',
    };
  });

  const evaluateResume = useCallback(
    async (isManualRefresh = false) => {
      setAnalysisError(null);
      const plainText = htmlToPlainText(resumeHtml);

      if (!plainText.trim() && !jdText.trim()) {
        setAtsBreakdown({
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
        });
        setExtractedKeywords([]);
        setSuggestions([]);
        return;
      }

      setIsAnalyzing(true);
      try {
        if (llmConfig && llmConfig.apiKey && jdText.trim() && plainText.trim()) {
          try {
            const result = await evaluateATSWithLLM(plainText, jdText, llmConfig);
            setAtsBreakdown(result.score);
            setExtractedKeywords(result.keywords);
            setSuggestions(result.suggestions);

            if (result.score.overallScore >= 95) {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
            }
          } catch (llmErr: any) {
            console.warn('LLM ATS evaluation failed, falling back to local engine:', llmErr);
            const score = calculateATSScore(plainText, jdText);
            const keywords = extractJobKeywords(jdText, plainText);
            const localSuggestions = await generateOptimizationSuggestions(plainText, jdText);

            setAtsBreakdown(score);
            setExtractedKeywords(keywords);
            setSuggestions(localSuggestions);
            setAnalysisError(`LLM call failed (${llmErr.message}). Evaluated using local ATS engine.`);
          }
        } else {
          const score = calculateATSScore(plainText, jdText);
          const keywords = extractJobKeywords(jdText, plainText);

          setAtsBreakdown(score);
          setExtractedKeywords(keywords);

          if (isManualRefresh || suggestions.length === 0) {
            const newSuggestions = await generateOptimizationSuggestions(plainText, jdText, llmConfig);
            setSuggestions(newSuggestions);

            if (score.overallScore >= 95) {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
              });
            }
          }
        }
      } catch (err: any) {
        console.error('Error analyzing resume:', err);
        const score = calculateATSScore(plainText, jdText);
        const keywords = extractJobKeywords(jdText, plainText);
        setAtsBreakdown(score);
        setExtractedKeywords(keywords);
        setAnalysisError(err.message || 'Evaluated using local ATS engine.');
      } finally {
        setIsAnalyzing(false);
      }
    },
    [resumeHtml, jdText, llmConfig, suggestions.length]
  );

  // Debounce automatic evaluation when JD or resume text changes
  useEffect(() => {
    if (!resumeHtml.trim() || !jdText.trim()) return;

    const timer = setTimeout(() => {
      evaluateResume(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [resumeHtml, jdText]);

  const handleSuggestionStatusChange = (id: string, status: Suggestion['status']) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleOpenHumanizer = (snippet: string, contextTitle: string = '') => {
    setHumanizerInitialText(snippet);
    setHumanizerContextTitle(contextTitle);
    setIsHumanizerOpen(true);
  };

  const insertSnippetRef = useRef<((snippet: string, targetSection?: string) => boolean) | null>(null);

  const handleInsertHumanizedText = (text: string) => {
    if (insertSnippetRef.current) {
      insertSnippetRef.current(text, 'Experience');
    }
  };

  const handleOpenDiscuss = (suggestion: Suggestion) => {
    setDiscussingSuggestion(suggestion);
    setIsDiscussOpen(true);
  };

  const handleApplyAdaptedSnippet = (
    suggestionId: string,
    updatedSnippet: string,
    insertDirectly: boolean
  ) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestionId
          ? {
              ...s,
              referenceSnippet: updatedSnippet,
              status: insertDirectly ? 'accepted' : s.status,
            }
          : s
      )
    );

    if (insertDirectly && insertSnippetRef.current) {
      const targetSec = discussingSuggestion?.targetSection || 'Experience';
      insertSnippetRef.current(updatedSnippet, targetSec);
    }
  };

  const handleExportDocx = async () => {
    try {
      const blob = await generateDocxBlob(resumeHtml || '<p>Resume</p>', resumeFileName.replace(/\.docx$/i, ''));
      saveAs(blob, resumeFileName.endsWith('.docx') ? resumeFileName : `${resumeFileName}.docx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Error exporting document.');
    }
  };

  const handleSaveSettings = (newConfig: LLMConfig) => {
    setLlmConfig(newConfig);
    localStorage.setItem('resume_improver_llm_config', JSON.stringify(newConfig));
    // Trigger re-evaluation with updated configuration
    setTimeout(() => {
      evaluateResume(true);
    }, 100);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 font-sans overflow-hidden">
      {/* Top Header & Navigation */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onReevaluate={() => evaluateResume(true)}
        onExportDocx={handleExportDocx}
        isAnalyzing={isAnalyzing}
        overallScore={atsBreakdown.overallScore}
      />

      {/* Dynamic API Status Warning Banner */}
      {analysisError && (
        <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs shadow-xs z-10 shrink-0">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{analysisError}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="underline font-semibold hover:text-rose-100 ml-4"
          >
            Check API Settings
          </button>
        </div>
      )}

      {/* Target Achievement Banner */}
      {atsBreakdown.overallScore >= 95 && (
        <div className="bg-emerald-600 text-white px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-semibold shadow-xs z-10 shrink-0">
          <Trophy className="w-4 h-4 text-amber-300" />
          <span>Congratulations! Your resume has achieved &gt;95% ATS Suitability for this Job Description!</span>
        </div>
      )}

      {/* Three-Panel Main Workspace */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* Panel 1: Left - Job Description & Keywords (3 cols) */}
        <section className="lg:col-span-3 h-full overflow-hidden flex flex-col">
          <JobDescriptionPanel
            jdText={jdText}
            onChangeJD={(text) => setJdText(text)}
            extractedKeywords={extractedKeywords}
          />
        </section>

        {/* Panel 2: Center - MS Word-Grade Document Editor (5 cols) */}
        <section className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <DocumentEditor
            initialContent={resumeHtml}
            onChange={setResumeHtml}
            onOpenHumanizerForSelection={(selectedText) =>
              handleOpenHumanizer(selectedText, 'Highlighted Resume Selection')
            }
            resumeFileName={resumeFileName}
            onFileLoaded={(name) => setResumeFileName(name)}
            onRegisterInsertSnippet={(inserter) => {
              insertSnippetRef.current = inserter;
            }}
          />
        </section>

        {/* Panel 3: Right - Compact Score Bar & Full-Height Optimization Hub (4 cols) */}
        <section className="lg:col-span-4 h-full overflow-hidden flex flex-col space-y-2.5">
          {/* Sleek Compact ATS Score Header with Collapsible Breakdown */}
          <CompactATSHeader breakdown={atsBreakdown} target={95} />

          {/* Hero Suggestion Tabs with Full Vertical Scrollable Area */}
          <div className="flex-1 overflow-hidden">
            <SuggestionTabs
              suggestions={suggestions}
              onStatusChange={handleSuggestionStatusChange}
              onOpenHumanizer={(snippet, title) => handleOpenHumanizer(snippet, title)}
              onInsertIntoEditor={handleInsertHumanizedText}
              onOpenDiscuss={handleOpenDiscuss}
            />
          </div>
        </section>
      </main>

      {/* Interactive Suggestion Discussion & Adaptation Modal */}
      <SuggestionDiscussModal
        isOpen={isDiscussOpen}
        onClose={() => setIsDiscussOpen(false)}
        suggestion={discussingSuggestion}
        jdText={jdText}
        resumeText={resumeHtml}
        llmConfig={llmConfig}
        onApplyAdaptedSnippet={handleApplyAdaptedSnippet}
      />

      {/* Humanizer & AI Tone Detection Modal */}
      <HumanizerModal
        isOpen={isHumanizerOpen}
        onClose={() => setIsHumanizerOpen(false)}
        initialText={humanizerInitialText}
        contextTitle={humanizerContextTitle}
        llmConfig={llmConfig}
        onInsertToEditor={handleInsertHumanizedText}
      />

      {/* OpenAI-Compatible LLM Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={llmConfig}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
