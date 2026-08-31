import React, { useState } from 'react';
import type { Suggestion } from '../types';
import { SuggestionCard } from './SuggestionCard';
import { ListFilter, CheckCircle2, Clock, Ban, Sparkles } from 'lucide-react';

interface SuggestionTabsProps {
  suggestions: Suggestion[];
  onStatusChange: (id: string, status: Suggestion['status']) => void;
  onOpenHumanizer: (snippet: string, context: string) => void;
  onInsertIntoEditor?: (text: string) => void;
}

export const SuggestionTabs: React.FC<SuggestionTabsProps> = ({
  suggestions,
  onStatusChange,
  onOpenHumanizer,
  onInsertIntoEditor,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'ignored'>('pending');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const pendingCount = suggestions.filter((s) => s.status === 'pending').length;
  const acceptedCount = suggestions.filter((s) => s.status === 'accepted').length;
  const ignoredCount = suggestions.filter((s) => s.status === 'ignored').length;
  const totalCount = suggestions.length;
  const completionRate = totalCount > 0 ? Math.round(((acceptedCount + ignoredCount) / totalCount) * 100) : 0;

  const filteredSuggestions = suggestions.filter((s) => {
    if (s.status !== activeTab) return false;
    if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
    return true;
  });

  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'ats_keyword', label: 'ATS Keywords' },
    { key: 'action_verbs', label: 'Action Verbs' },
    { key: 'brevity_cliche', label: 'Brevity & Cliché' },
    { key: 'structure_formatting', label: 'Structure' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Tab Header & Progress Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Optimization Suggestions
          </h3>
          <span className="text-xs font-semibold text-slate-600">
            {completionRate}% Addressed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>

        {/* Main Status Tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-blue-700 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accepted')}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'accepted'
                ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Applied ({acceptedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ignored')}
            className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ignored'
                ? 'bg-white text-slate-700 font-semibold shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Ignored ({ignoredCount})</span>
          </button>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 no-scrollbar">
          <ListFilter className="w-3 h-3 text-slate-400 shrink-0" />
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setSelectedCategory(c.key)}
              className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap transition-colors ${
                selectedCategory === c.key
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions List Container */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
        {filteredSuggestions.length > 0 ? (
          filteredSuggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onStatusChange={onStatusChange}
              onOpenHumanizer={onOpenHumanizer}
              onInsertIntoEditor={onInsertIntoEditor}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No suggestions here</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeTab === 'pending'
                ? 'All pending suggestions have been addressed!'
                : `No items marked as ${activeTab}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
