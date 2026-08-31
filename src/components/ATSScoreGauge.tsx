import React from 'react';
import { Target, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ATSScoreGaugeProps {
  score: number;
  target?: number;
  size?: number;
}

export const ATSScoreGauge: React.FC<ATSScoreGaugeProps> = ({
  score,
  target = 95,
  size = 140,
}) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Determine color scheme
  let strokeColor = '#ef4444'; // Red
  let badgeBg = 'bg-red-50 text-red-700 border-red-200';
  let statusText = 'Needs Improvement';
  let StatusIcon = AlertCircle;

  if (clampedScore >= 95) {
    strokeColor = '#10b981'; // Emerald
    badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    statusText = 'Target Achieved (>95%)';
    StatusIcon = Sparkles;
  } else if (clampedScore >= 80) {
    strokeColor = '#3b82f6'; // Blue
    badgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
    statusText = 'Strong Match';
    StatusIcon = CheckCircle2;
  } else if (clampedScore >= 60) {
    strokeColor = '#f59e0b'; // Amber
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
    statusText = 'Moderate Fit';
    StatusIcon = AlertCircle;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Target marker indicator */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${(target / 100) * circumference} ${circumference}`}
            fill="transparent"
            className="opacity-40"
          />
          {/* Active progress circle */}
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
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.5s ease' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {clampedScore}%
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            ATS Score
          </span>
        </div>
      </div>

      {/* Target and Status Badges */}
      <div className="mt-3 flex items-center gap-2">
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeBg}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusText}</span>
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
        <Target className="w-3 h-3 text-slate-400" />
        <span>Optimization Target: <strong>&gt;{target}%</strong></span>
      </div>
    </div>
  );
};
