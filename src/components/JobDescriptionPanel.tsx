import React, { useState } from 'react';
import type { ExtractedKeyword } from '../types';
import {
  Briefcase,
  Search,
  CheckCircle2,
  XCircle,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface JobDescriptionPanelProps {
  jdText: string;
  onChangeJD: (text: string) => void;
  extractedKeywords: ExtractedKeyword[];
}

export const JobDescriptionPanel: React.FC<JobDescriptionPanelProps> = ({
  jdText,
  onChangeJD,
  extractedKeywords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'matched'>('all');
  const [isKeywordListOpen, setIsKeywordListOpen] = useState(true);

  const matchedCount = extractedKeywords.filter((k) => k.foundInResume).length;
  const missingCount = extractedKeywords.filter((k) => !k.foundInResume).length;

  const filteredKeywords = extractedKeywords.filter((k) => {
    if (activeFilter === 'missing' && k.foundInResume) return false;
    if (activeFilter === 'matched' && !k.foundInResume) return false;
    if (searchTerm && !k.keyword.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Panel Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Target Job Description
            </h3>
            <p className="text-[11px] text-slate-500">
              Paste JD text or markdown to match against
            </p>
          </div>
        </div>
      </div>

      {/* JD Input Area */}
      <div className="p-3 border-b border-slate-200">
        <textarea
          value={jdText}
          onChange={(e) => onChangeJD(e.target.value)}
          rows={7}
          className="w-full text-xs text-slate-800 p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white leading-relaxed resize-none"
          placeholder="Paste Job Description, roles, responsibilities, and qualifications here..."
        />
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span>{jdText.trim() ? jdText.trim().split(/\s+/).length : 0} words</span>
          <span>Auto-scanned against resume</span>
        </div>
      </div>

      {/* Extracted Keywords & Skills Section */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsKeywordListOpen(!isKeywordListOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <span>Target Keywords ({extractedKeywords.length})</span>
            {isKeywordListOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {matchedCount}
            </span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
              <XCircle className="w-2.5 h-2.5" />
              {missingCount}
            </span>
          </div>
        </div>

        {isKeywordListOpen && (
          <div className="flex flex-col flex-1 overflow-hidden p-3 space-y-2.5">
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter keywords..."
                  className="w-full pl-6 pr-2 py-1 text-[11px] bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex bg-slate-100 p-0.5 rounded-md text-[10px]">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-1.5 py-0.5 rounded ${activeFilter === 'all' ? 'bg-white font-medium text-slate-800 shadow-2xs' : 'text-slate-500'}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('missing')}
                  className={`px-1.5 py-0.5 rounded ${activeFilter === 'missing' ? 'bg-white font-medium text-rose-700 shadow-2xs' : 'text-slate-500'}`}
                >
                  Missing
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('matched')}
                  className={`px-1.5 py-0.5 rounded ${activeFilter === 'matched' ? 'bg-white font-medium text-emerald-700 shadow-2xs' : 'text-slate-500'}`}
                >
                  Found
                </button>
              </div>
            </div>

            {/* Keywords List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredKeywords.length > 0 ? (
                filteredKeywords.map((kw, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                      kw.foundInResume
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {kw.foundInResume ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      )}
                      <span className="font-medium truncate">{kw.keyword}</span>
                    </div>

                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      kw.foundInResume ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {kw.foundInResume ? 'In Resume' : 'Missing'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[11px] text-slate-400">
                  No keywords matching filter
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
