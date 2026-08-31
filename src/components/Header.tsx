import React from 'react';
import {
  FileCheck2,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  Download,
} from 'lucide-react';

interface HeaderProps {
  overallScore: number;
  isAnalyzing: boolean;
  onReevaluate: () => void;
  onOpenSettings: () => void;
  onExportDocx: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  overallScore,
  isAnalyzing,
  onReevaluate,
  onOpenSettings,
  onExportDocx,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-20 shrink-0">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
          <FileCheck2 className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              Resume ATS Improver
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-2.5 h-2.5" />
              AI Powered
            </span>
          </div>
        </div>
      </div>

      {/* Target Status & Actions */}
      <div className="flex items-center gap-2.5">
        {/* ATS Target Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
            <Target className="w-3.5 h-3.5 text-blue-600" />
            <span>Target: &gt;95% ATS</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className={`text-xs font-bold ${overallScore >= 95 ? 'text-emerald-600' : overallScore >= 80 ? 'text-blue-600' : 'text-amber-600'}`}>
            Current: {overallScore}%
          </span>
        </div>

        {/* Re-evaluate Button */}
        <button
          type="button"
          onClick={onReevaluate}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors"
          title="Re-scan document against job description to calculate updated ATS score"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Evaluating...' : 'Re-Evaluate ATS Score'}</span>
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExportDocx}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export .docx</span>
        </button>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="OpenAI-Compatible LLM Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
