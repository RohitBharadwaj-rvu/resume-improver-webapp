import React, { useState, useEffect, useRef } from 'react';
import type { Suggestion, LLMConfig } from '../types';
import { chatWithSuggestionCoach, type ChatMessage } from '../services/llmChat';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Check,
  Copy,
  Tag,
  Loader2,
  CheckCircle2,
  Edit3,
  Lightbulb,
} from 'lucide-react';

interface SuggestionDiscussModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: Suggestion | null;
  jdText: string;
  resumeText: string;
  llmConfig?: LLMConfig;
  onApplyAdaptedSnippet: (suggestionId: string, updatedSnippet: string, insertDirectly: boolean) => void;
}

export const SuggestionDiscussModal: React.FC<SuggestionDiscussModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  jdText,
  resumeText,
  llmConfig,
  onApplyAdaptedSnippet,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentSnippet, setCurrentSnippet] = useState('');
  const [isEditingSnippet, setIsEditingSnippet] = useState(false);
  const [copied, setCopied] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize conversation when opened for a suggestion
  useEffect(() => {
    if (isOpen && suggestion) {
      setCurrentSnippet(suggestion.referenceSnippet);
      setIsEditingSnippet(false);

      const initialGreeting: ChatMessage = {
        id: 'init-msg',
        role: 'assistant',
        content: `Hi! I recommended adding this point for **"${suggestion.title}"** in your **${suggestion.targetSection || 'Experience'}** section:\n\n*"${suggestion.referenceSnippet}"*\n\nHow does this align with your actual experience? Tell me what you achieved, any specific numbers or tech stacks, and I'll adapt this bullet point to fit your real story perfectly.`,
      };

      setMessages([initialGreeting]);
    }
  }, [isOpen, suggestion]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, isSending]);

  if (!isOpen || !suggestion) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent || isSending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageContent,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsSending(true);

    try {
      const historyForApi = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const context = {
        suggestionTitle: suggestion.title,
        targetSection: suggestion.targetSection || 'Experience',
        referenceSnippet: currentSnippet,
        jdText,
        resumeText,
      };

      const { reply, revisedSnippet } = await chatWithSuggestionCoach(
        historyForApi,
        context,
        llmConfig
      );

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (revisedSnippet) {
        setCurrentSnippet(revisedSnippet);
      }
    } catch (err: any) {
      console.error('Discussion error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an issue: ${err.message}. You can manually edit the snippet above or check your API key in Settings.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertDirectly = () => {
    onApplyAdaptedSnippet(suggestion.id, currentSnippet, true);
    onClose();
  };

  const handleUpdateCardOnly = () => {
    onApplyAdaptedSnippet(suggestion.id, currentSnippet, false);
    onClose();
  };

  const quickPrompts = [
    'Add strong business metrics & ROI',
    'Make it sound more executive',
    'Align closer to Job Description',
    'Make it shorter and more concise',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl h-[85vh] max-h-[750px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/30 rounded-lg border border-blue-400/30">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">
                  Discuss &amp; Adapt Suggestion
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  AI Coach
                </span>
              </div>
              <p className="text-[11px] text-slate-300 flex items-center gap-1.5 mt-0.5">
                <Tag className="w-3 h-3 text-slate-400" />
                <span>{suggestion.targetSection || 'Experience'}</span>
                <span>•</span>
                <span className="text-slate-200 font-medium">{suggestion.title}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Snippet Banner (Dynamic Adaptation Preview) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5 text-blue-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Live Adapted Snippet
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingSnippet(!isEditingSnippet)}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
              >
                <Edit3 className="w-3 h-3" />
                {isEditingSnippet ? 'Done' : 'Manual Edit'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {isEditingSnippet ? (
            <textarea
              value={currentSnippet}
              onChange={(e) => setCurrentSnippet(e.target.value)}
              rows={2}
              className="w-full text-xs p-2 rounded-lg border border-blue-400 bg-white text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          ) : (
            <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 italic leading-relaxed shadow-2xs">
              "{currentSnippet}"
            </div>
          )}
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-100/60">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs mt-0.5">
                  AI
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex gap-2.5 justify-start items-center text-xs text-slate-500">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                AI
              </div>
              <div className="bg-white rounded-xl px-3.5 py-2 border border-slate-200 flex items-center gap-1.5 shadow-2xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Adapting suggestion based on your input...</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 shrink-0">
            <Lightbulb className="w-3 h-3 text-amber-500" /> Quick:
          </span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              disabled={isSending}
              className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-md border border-slate-200 shrink-0 transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Tell the agent about your actual experience or ask to adjust..."
              disabled={isSending}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-3.5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-xs font-semibold flex items-center gap-1 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpdateCardOnly}
              className="px-3 py-1.5 text-xs border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              title="Update reference snippet on the suggestion card without inserting yet"
            >
              Update Card Only
            </button>

            <button
              type="button"
              onClick={handleInsertDirectly}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              title="Insert adapted snippet directly into resume document"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply &amp; Insert into Resume</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
