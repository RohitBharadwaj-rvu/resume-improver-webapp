import React, { useState } from 'react';
import type { ATSScoreBreakdown } from '../types';
import {
  Target,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Zap,
  Layout,
  FileText,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react';

interface CompactATSHeaderProps {
  breakdown: ATSScoreBreakdown;
  target?: number;
}

export const CompactATSHeader: React.FC<CompactATSHeaderProps> = ({
  breakdown,
  target = 95,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const score = breakdown.overallScore;

  // Gauge calculations for mini ring
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  let strokeColor = '#ef4444';
  let badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
  let badgeText = 'Needs Work';

  if (clampedScore >= 95) {
    strokeColor = '#10b981';
    badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    badgeText = 'Ready (>95%)';
  } else if (clampedScore >= 80) {
    strokeColor = '#3b82f6';
    badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
    badgeText = 'Good Fit';
  } else if (clampedScore >= 60) {
    strokeColor = '#f59e0b';
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
    badgeText = 'Moderate';
  }

  const metrics = [
    { label: 'Keywords', score: breakdown.keywordMatchScore, icon: KeyRound, color: 'bg-blue-500' },
    { label: 'Verbs', score: breakdown.actionVerbScore, icon: Zap, color: 'bg-amber-500' },
    { label: 'Structure', score: breakdown.formattingScore, icon: Layout, color: 'bg-indigo-500' },
    { label: 'Metrics', score: breakdown.brevityScore, icon: FileText, color: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
      {/* Compact Score Bar */}
      <div className="p-3 flex items-center justify-between gap-3">
        {/* Left: Mini Circular Radial Gauge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.6s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-sm font-bold text-slate-900 leading-none">
                {clampedScore}%
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900">ATS Score</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${badgeBg}`}>
                {badgeText}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
              <Target className="w-3 h-3 text-slate-400" />
              <span>Goal: <strong>&gt;{target}%</strong></span>
            </div>
          </div>
        </div>

        {/* Center: Mini 4-Metric Grid */}
        <div className="hidden sm:grid grid-cols-2 gap-x-3 gap-y-1 flex-1 max-w-[240px]">
          {metrics.map((m, idx) => (
            <div key={idx} className="flex flex-col text-[10px]">
              <div className="flex items-center justify-between text-slate-600 mb-0.5">
                <span className="truncate">{m.label}</span>
                <span className="font-semibold text-slate-800">{m.score}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full ${m.color} rounded-full`}
                  style={{ width: `${Math.min(100, Math.max(0, m.score))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Right: Expand Details Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
            isExpanded
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
          title="Toggle Detailed Keywords & Metrics Breakdown"
        >
          <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Breakdown Drawer */}
      {isExpanded && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 bg-slate-50/70 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 mb-2">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              Keywords Match ({breakdown.matchedKeywords.length} Matched / {breakdown.missingKeywords.length} Missing)
            </span>
          </div>

          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
            {breakdown.matchedKeywords.map((kw, i) => (
              <span
                key={`m-${i}`}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <CheckCircle2 className="w-2.5 h-2.5" />
                {kw}
              </span>
            ))}
            {breakdown.missingKeywords.map((kw, i) => (
              <span
                key={`ms-${i}`}
                className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200"
              >
                <XCircle className="w-2.5 h-2.5" />
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
