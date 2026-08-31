import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { JobDescriptionPanel } from './components/JobDescriptionPanel';
import { DocumentEditor } from './components/DocumentEditor';
import { CompactATSHeader } from './components/CompactATSHeader';
import { SuggestionTabs } from './components/SuggestionTabs';
import { HumanizerModal } from './components/HumanizerModal';
import { SettingsModal } from './components/SettingsModal';
import {
  calculateATSScore,
  extractJobKeywords,
  generateOptimizationSuggestions,
} from './services/atsEngine';
import { htmlToPlainText, generateDocxBlob } from './services/docManager';
import type { ATSScoreBreakdown, ExtractedKeyword, Suggestion, LLMConfig } from './types';
import confetti from 'canvas-confetti';
import saveAs from 'file-saver';
import { Trophy } from 'lucide-react';

const INITIAL_RESUME_HTML = `
<h1>Alex Mercer</h1>
<p style="text-align: center;"><strong>Senior Full Stack Engineer</strong> | alex.mercer@email.com | (555) 345-6789 | San Francisco, CA | github.com/alexmercer</p>

<h2>Professional Summary</h2>
<p>Dedicated Full Stack Engineer with 5+ years of experience building high-performance web applications using React, TypeScript, and Node.js. Passionate about scalable distributed architecture, clean code standards, and automated CI/CD pipelines.</p>

<h2>Technical Skills</h2>
<ul>
  <li><strong>Languages:</strong> TypeScript, JavaScript (ES6+), Python, SQL</li>
  <li><strong>Frontend:</strong> React, Next.js, Tailwind CSS, Redux Toolkit, HTML5/CSS3</li>
  <li><strong>Backend:</strong> Node.js, Express, REST APIs, GraphQL, PostgreSQL, Redis</li>
  <li><strong>Cloud & DevOps:</strong> Docker, AWS (S3, EC2, Lambda), CI/CD, Git, Jest</li>
</ul>

<h2>Professional Experience</h2>
<p><strong>CloudScale Technologies</strong> — <em>Senior Software Engineer</em> (2022 – Present)</p>
<ul>
  <li>Architected and deployed 12+ scalable microservices in Node.js and TypeScript, handling over 2.5M daily active API requests with 99.98% uptime.</li>
  <li>Redesigned core PostgreSQL database schema and introduced Redis caching, reducing query latency by 42% across critical endpoints.</li>
  <li>Streamlined deployment processes by implementing GitHub Actions automated CI/CD pipelines, decreasing release cycle times from 2 days to under 30 minutes.</li>
  <li>Mentored a team of 4 junior developers on TypeScript best practices and automated testing, improving overall Jest code coverage to 92%.</li>
</ul>

<p><strong>Nexus Digital Solutions</strong> — <em>Full Stack Developer</em> (2019 – 2022)</p>
<ul>
  <li>Developed responsive customer-facing web applications using React, TypeScript, and Tailwind CSS, increasing user conversion rates by 28%.</li>
  <li>Built and maintained robust RESTful APIs connecting relational databases with frontend interfaces.</li>
  <li>Participated in agile sprint cycles, daily standups, and bi-weekly architecture design reviews.</li>
</ul>

<h2>Education</h2>
<p><strong>Bachelor of Science in Computer Science</strong> — University of California, Berkeley (2015 – 2019)</p>
`;

const INITIAL_JD = `Senior Full Stack Software Engineer (React / TypeScript / Node.js)

About the Role:
We are seeking a Senior Full Stack Engineer to lead the development of our high-throughput cloud platforms. You will design, build, and scale frontend interfaces and backend microservices.

Key Responsibilities:
- Architect and develop scalable web applications using React, TypeScript, Node.js, and GraphQL
- Design resilient database schemas using PostgreSQL and high-speed caching with Redis
- Deploy containerized cloud microservices utilizing Docker, Kubernetes, and AWS
- Establish automated CI/CD delivery pipelines and champion robust Jest/Vitest testing practices
- Mentor engineering team members and collaborate closely with product management in agile sprints

Requirements:
- 5+ years of production experience with React, TypeScript, and Node.js
- Strong proficiency with PostgreSQL, Redis, and REST/GraphQL API architecture
- Hands-on experience with Docker, AWS cloud infrastructure, and CI/CD pipelines
- Proven ability to write clean, maintainable, test-driven code (Jest/Vitest)
- Strong communication skills and leadership experience`;

export function App() {
  const [resumeHtml, setResumeHtml] = useState(INITIAL_RESUME_HTML);
  const [resumeFileName, setResumeFileName] = useState('Alex_Mercer_Resume.docx');
  const [jdText, setJdText] = useState(INITIAL_JD);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
      setIsAnalyzing(true);
      const plainText = htmlToPlainText(resumeHtml);
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

      setIsAnalyzing(false);
    },
    [resumeHtml, jdText, llmConfig, suggestions.length]
  );

  useEffect(() => {
    evaluateResume(true);
  }, []);

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

  const handleInsertHumanizedText = (text: string) => {
    setResumeHtml((prev) => `${prev}<p>${text}</p>`);
  };

  const handleExportDocx = async () => {
    try {
      const blob = await generateDocxBlob(resumeHtml, resumeFileName.replace(/\.docx$/i, ''));
      saveAs(blob, resumeFileName.endsWith('.docx') ? resumeFileName : `${resumeFileName}.docx`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Error exporting document.');
    }
  };

  const handleSaveSettings = (newConfig: LLMConfig) => {
    setLlmConfig(newConfig);
    localStorage.setItem('resume_improver_llm_config', JSON.stringify(newConfig));
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans select-none">
      {/* Top Header Bar */}
      <Header
        overallScore={atsBreakdown.overallScore}
        isAnalyzing={isAnalyzing}
        onReevaluate={() => evaluateResume(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExportDocx={handleExportDocx}
      />

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
            onChangeJD={(text) => {
              setJdText(text);
              const plain = htmlToPlainText(resumeHtml);
              setExtractedKeywords(extractJobKeywords(text, plain));
            }}
            extractedKeywords={extractedKeywords}
          />
        </section>

        {/* Panel 2: Center - MS Word-Grade Document Editor (5 cols) */}
        <section className="lg:col-span-5 h-full overflow-hidden flex flex-col">
          <DocumentEditor
            initialContent={resumeHtml}
            onChange={(html) => {
              setResumeHtml(html);
              const plain = htmlToPlainText(html);
              setAtsBreakdown(calculateATSScore(plain, jdText));
              setExtractedKeywords(extractJobKeywords(jdText, plain));
            }}
            onOpenHumanizerForSelection={(selectedText) =>
              handleOpenHumanizer(selectedText, 'Highlighted Resume Selection')
            }
            resumeFileName={resumeFileName}
            onFileLoaded={(name) => setResumeFileName(name)}
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
            />
          </div>
        </section>
      </main>

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
