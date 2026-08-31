import React from 'react';
import type { ATSScoreBreakdown } from '../types';
import { KeyRound, Zap, Layout, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface ScoreBreakdownCardProps {
  breakdown: ATSScoreBreakdown;
}

export const ScoreBreakdownCard: React.FC<ScoreBreakdownCardProps> = ({ breakdown }) => {
  const metrics = [
    {
      label: 'Keywords & Skills Match',
      score: breakdown.keywordMatchScore,
      icon: KeyRound,
      color: 'bg-blue-500',
      description: `${breakdown.matchedKeywords.length} matched, ${breakdown.missingKeywords.length} missing`,
    },
    {
      label: 'Action Verbs & Impact',
      score: breakdown.actionVerbScore,
      icon: Zap,
      color: 'bg-amber-500',
      description: `${breakdown.strongVerbsCount} strong verbs, ${breakdown.weakVerbsFound.length} passive phrases`,
    },
    {
      label: 'Structure & Formatting',
      score: breakdown.formattingScore,
      icon: Layout,
      color: 'bg-indigo-500',
      description: 'Standard ATS headings & hierarchy',
    },
    {
      label: 'Brevity & Measurable Metrics',
      score: breakdown.brevityScore,
      icon: FileText,
      color: 'bg-emerald-500',
      description: 'Quantified metrics & conciseness',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Suitability Breakdown
      </h3>

      <div className="space-y-3.5">
        {metrics.map((m, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <m.icon className="w-3.5 h-3.5 text-slate-400" />
                <span>{m.label}</span>
              </div>
              <span className="font-semibold text-slate-900">{m.score}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${m.color} transition-all duration-500`}
                style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500">{m.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Matched & Missing Keywords Tags */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-[11px] mb-2 font-medium text-slate-600">
          <span>Target Keywords Overview</span>
          <span className="text-slate-400">
            {breakdown.matchedKeywords.length}/{breakdown.matchedKeywords.length + breakdown.missingKeywords.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
          {breakdown.matchedKeywords.map((kw, i) => (
            <span
              key={`m-${i}`}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              {kw}
            </span>
          ))}
          {breakdown.missingKeywords.slice(0, 8).map((kw, i) => (
            <span
              key={`ms-${i}`}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
            >
              <XCircle className="w-2.5 h-2.5" />
              {kw}
            </span>
          ))}
          {breakdown.missingKeywords.length > 8 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{breakdown.missingKeywords.length - 8} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
