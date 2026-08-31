import React, { useState, useEffect } from 'react';
import type { HumanizerResult, LLMConfig } from '../types';
import { humanizeText } from '../services/humanizer';
import {
  Sparkles,
  X,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileEdit,
  Send,
  Loader2,
} from 'lucide-react';

interface HumanizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  contextTitle?: string;
  llmConfig?: LLMConfig;
  onInsertToEditor?: (text: string) => void;
}

export const HumanizerModal: React.FC<HumanizerModalProps> = ({
  isOpen,
  onClose,
  initialText,
  contextTitle,
  llmConfig,
  onInsertToEditor,
}) => {
  const [inputText, setInputText] = useState(initialText);
  const [result, setResult] = useState<HumanizerResult | null>(null);
  const [editedText, setEditedText] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialText) {
      setInputText(initialText);
      runHumanize(initialText);
    }
  }, [isOpen, initialText]);

  const runHumanize = async (textToProcess: string) => {
    if (!textToProcess.trim()) return;
    setLoading(true);
    try {
      const res = await humanizeText(textToProcess, contextTitle, llmConfig);
      setResult(res);
      setEditedText(res.humanized);
    } catch (err) {
      console.error('Humanizer processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertToEditor) {
      onInsertToEditor(editedText);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                AI Detection &amp; Humanizer Tool
              </h3>
              <p className="text-xs text-slate-500">
                {contextTitle ? `Context: ${contextTitle}` : 'Transform generic AI clichés into authentic, human phrasing'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Side-by-Side Comparison */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Indicator Cards */}
          {result && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${result.aiConfidenceScore > 50 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">AI Tone Score</div>
                  <div className="text-sm font-bold text-slate-900">{result.aiConfidenceScore}% Detected</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Detected Clichés</div>
                  <div className="text-sm font-bold text-slate-900">{result.detectedCliches.length} Buzzwords</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <FileEdit className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Style Check</div>
                  <div className="text-sm font-bold text-slate-900">Active Voice Ready</div>
                </div>
              </div>
            </div>
          )}

          {/* Side by Side Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Original / AI draft */}
            <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>Original / AI Text</span>
                <span className="text-[10px] text-slate-500 font-normal">Editable input</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={6}
                className="p-3 text-xs text-slate-800 bg-white border-0 focus:outline-hidden focus:ring-1 focus:ring-blue-500 resize-none font-sans leading-relaxed"
                placeholder="Paste or type text to check and humanize..."
              />
              <div className="p-2 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => runHumanize(inputText)}
                  disabled={loading}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {loading ? 'Analyzing...' : 'Re-Humanize'}
                </button>
              </div>
            </div>

            {/* Right Column: Humanized Phrasing & Scratchpad */}
            <div className="flex flex-col rounded-xl border border-emerald-200 bg-emerald-50/30 overflow-hidden">
              <div className="px-3.5 py-2 bg-emerald-100/60 border-b border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
                <span>Humanized Rewrite &amp; Personal Scratchpad</span>
                <span className="text-[10px] text-emerald-700 font-normal">Add your real metrics</span>
              </div>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={6}
                className="p-3 text-xs text-slate-900 bg-white border-0 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 resize-none font-sans leading-relaxed"
                placeholder="Humanized output will appear here..."
              />
              <div className="p-2 bg-emerald-50/50 border-t border-emerald-200 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tip: Inject your authentic company names &amp; metrics.</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:bg-emerald-100 rounded font-medium transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Cliché Breakdown Table */}
          {result && result.detectedCliches.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                Flagged AI Tells &amp; Recommended Replacements
              </div>
              <div className="divide-y divide-slate-100">
                {result.detectedCliches.map((item, i) => (
                  <div key={i} className="p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <span className="line-through text-rose-600 font-semibold mr-2">
                        "{item.phrase}"
                      </span>
                      <span className="text-slate-500 text-[11px]">{item.reason}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 shrink-0">
                      <ArrowRight className="w-3 h-3 text-emerald-500" />
                      <span>Use: {item.replacement}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            {onInsertToEditor && (
              <button
                type="button"
                onClick={handleInsert}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Insert into Resume
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
