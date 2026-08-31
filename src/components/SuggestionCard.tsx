import React, { useState } from 'react';
import type { Suggestion } from '../types';
import {
  Copy,
  Check,
  Sparkles,
  CheckCircle,
  Edit3,
  X,
  RotateCcw,
  Tag,
} from 'lucide-react';

interface SuggestionCardProps {
  suggestion: Suggestion;
  onStatusChange: (id: string, status: Suggestion['status']) => void;
  onOpenHumanizer: (snippet: string, context: string) => void;
  onInsertIntoEditor?: (text: string) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  onStatusChange,
  onOpenHumanizer,
  onInsertIntoEditor,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingPartial, setIsEditingPartial] = useState(false);
  const [adaptedSnippet, setAdaptedSnippet] = useState(suggestion.referenceSnippet);

  const handleCopy = () => {
    navigator.clipboard.writeText(isEditingPartial ? adaptedSnippet : suggestion.referenceSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyPartial = () => {
    if (onInsertIntoEditor) {
      onInsertIntoEditor(adaptedSnippet);
    }
    onStatusChange(suggestion.id, 'accepted');
    setIsEditingPartial(false);
  };

  const categoryConfig: Record<string, { label: string; bg: string; text: string }> = {
    ats_keyword: { label: 'ATS Keyword', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    action_verbs: { label: 'Action Verb', bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700' },
    brevity_cliche: { label: 'Brevity & Cliché', bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
    structure_formatting: { label: 'Structure', bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700' },
    grammar_tone: { label: 'Tone & Clarity', bg: 'bg-teal-50 border-teal-200', text: 'text-teal-700' },
  };

  const currentCat = categoryConfig[suggestion.category] || {
    label: 'Improvement',
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
  };

  const impactBadge = {
    high: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-50 text-slate-700 border-slate-200',
  }[suggestion.impact];

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-4 ${
        suggestion.status === 'accepted'
          ? 'bg-emerald-50/40 border-emerald-200'
          : suggestion.status === 'ignored'
          ? 'bg-slate-50/60 border-slate-200 opacity-60'
          : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
      }`}
    >
      {/* Card Header: Category & Impact Badges */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${currentCat.bg} ${currentCat.text}`}>
            {currentCat.label}
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wider ${impactBadge}`}>
            {suggestion.impact} Impact
          </span>
        </div>

        {suggestion.targetSection && (
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <Tag className="w-3 h-3" />
            {suggestion.targetSection}
          </span>
        )}
      </div>

      {/* Title & Description */}
      <h4 className="text-sm font-semibold text-slate-900 mb-1">
        {suggestion.title}
      </h4>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        {suggestion.description}
      </p>

      {/* Tailored Reference Snippet Container */}
      {suggestion.referenceSnippet && (
        <div className="mb-3 bg-slate-50 rounded-lg border border-slate-200 p-2.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Tailored Reference Snippet
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenHumanizer(suggestion.referenceSnippet, suggestion.title)}
                className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                title="Open Side-by-Side Humanizer"
              >
                <Sparkles className="w-3 h-3" />
                Humanize
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium px-1.5 py-0.5 rounded hover:bg-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {isEditingPartial ? (
            <div className="space-y-2 mt-1">
              <textarea
                value={adaptedSnippet}
                onChange={(e) => setAdaptedSnippet(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 rounded border border-blue-300 bg-white text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                placeholder="Adapt this snippet with your personal metrics and history..."
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingPartial(false)}
                  className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyPartial}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                >
                  <Check className="w-3 h-3" />
                  Save &amp; Mark Applied
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-800 italic bg-white p-2 rounded border border-slate-100 font-sans">
              "{suggestion.referenceSnippet}"
            </p>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        {suggestion.status === 'pending' ? (
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => onStatusChange(suggestion.id, 'accepted')}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-2xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Accept
            </button>

            <button
              type="button"
              onClick={() => setIsEditingPartial(!isEditingPartial)}
              className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              title="Edit & adapt snippet with your experience before applying"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Adapt
            </button>

            <button
              type="button"
              onClick={() => onStatusChange(suggestion.id, 'ignored')}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs rounded-lg transition-colors"
              title="Ignore this suggestion"
            >
              <X className="w-3.5 h-3.5" />
              Ignore
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${
                suggestion.status === 'accepted' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {suggestion.status === 'accepted' ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5" /> Applied to Resume
                </>
              ) : (
                <>
                  <X className="w-3.5 h-3.5" /> Dismissed
                </>
              )}
            </span>

            <button
              type="button"
              onClick={() => onStatusChange(suggestion.id, 'pending')}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              Reopen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
