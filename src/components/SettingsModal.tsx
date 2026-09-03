import React, { useState } from 'react';
import type { LLMConfig } from '../types';
import {
  Settings,
  X,
  KeyRound,
  Globe,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  DownloadCloud,
  ExternalLink,
  FolderOpen,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';
import { checkGitHubUpdate, type AppUpdateInfo, CURRENT_APP_VERSION } from '../services/updater';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
  onGetSessionSnapshot?: () => any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onGetSessionSnapshot,
}) => {
  const [formData, setFormData] = useState<LLMConfig>(config);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [updateProgressText, setUpdateProgressText] = useState('');
  const [updatePercent, setUpdatePercent] = useState(0);

  const handleCopyKey = () => {
    if (formData.apiKey) {
      navigator.clipboard.writeText(formData.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking');
    setUpdateError(null);
    try {
      const info = await checkGitHubUpdate();
      setUpdateInfo(info);
      if (info.hasUpdate) {
        setUpdateStatus('available');
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (err: any) {
      setUpdateStatus('error');
      setUpdateError(err.message || 'Unable to check for updates.');
    }
  };

  const handlePerformUpdate = async () => {
    if (!updateInfo) return;
    if (!window.electronAPI?.installUpdateAndRestart) {
      handleOpenReleaseUrl();
      return;
    }

    setIsApplyingUpdate(true);
    setUpdatePercent(0);
    setUpdateProgressText('Saving current session and preparing update...');

    const snapshot = onGetSessionSnapshot ? onGetSessionSnapshot() : null;

    let cleanupListener: (() => void) | null = null;
    if (window.electronAPI?.onUpdateProgress) {
      cleanupListener = window.electronAPI.onUpdateProgress((data) => {
        setUpdatePercent(data.percent || 0);
        if (data.status === 'extracting') {
          setUpdateProgressText('Extracting update files and restarting application...');
        } else if (data.receivedMB && data.totalMB) {
          setUpdateProgressText(`Downloading update: ${data.percent}% (${data.receivedMB} MB / ${data.totalMB} MB)...`);
        } else {
          setUpdateProgressText(`Downloading update: ${data.percent}%...`);
        }
      });
    }

    try {
      const result = await window.electronAPI.installUpdateAndRestart(updateInfo.downloadUrl, snapshot);
      if (!result.success) {
        throw new Error(result.error || 'Update installation failed.');
      }
    } catch (err: any) {
      setIsApplyingUpdate(false);
      if (cleanupListener) cleanupListener();
      setUpdateStatus('error');
      setUpdateError(err.message || 'Failed to apply update.');
    }
  };

  const handleOpenReleaseUrl = () => {
    const url = updateInfo?.releaseUrl || 'https://github.com/RohitBharadwaj-rvu/resume-improver-webapp/releases';
    if (window.electronAPI?.openExternalUrl) {
      window.electronAPI.openExternalUrl(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const handleOpenDraftsFolder = async () => {
    if (window.electronAPI?.openDraftsFolder) {
      await window.electronAPI.openDraftsFolder();
    }
  };

  if (!isOpen) return null;

  const presets: Record<string, { baseUrl: string; defaultModel: string }> = {
    openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-4o' },
    openrouter: { baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'anthropic/claude-3.5-sonnet' },
    groq: { baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile' },
    ollama: { baseUrl: 'http://localhost:11434/v1', defaultModel: 'llama3.1:latest' },
    lmstudio: { baseUrl: 'http://localhost:1234/v1', defaultModel: 'local-model' },
    custom: { baseUrl: '', defaultModel: '' },
  };

  const handleProviderSelect = (provider: LLMConfig['provider']) => {
    if (!provider) return;
    const preset = presets[provider] || presets.custom;
    setFormData((prev) => ({
      ...prev,
      provider,
      baseUrl: preset.baseUrl || prev.baseUrl,
      model: preset.defaultModel || prev.model,
    }));
  };

  const handleTestConnection = async () => {
    if (!formData.baseUrl) {
      setTestStatus('error');
      setTestMessage('Base URL is required.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      const url = `${formData.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(formData.apiKey ? { Authorization: `Bearer ${formData.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: formData.model || 'gpt-4o',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      if (res.ok) {
        setTestStatus('success');
        setTestMessage('Connected successfully! Endpoint is ready.');
      } else {
        const errorText = await res.text();
        setTestStatus('error');
        setTestMessage(`Connection failed (${res.status}): ${errorText.slice(0, 100)}`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(`Failed to reach endpoint: ${err.message}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[calc(100vh-5.5rem)] flex flex-col min-h-0 overflow-hidden my-auto">
        {/* Modal Header with Quick Save */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">
                OpenAI-Compatible LLM Settings
              </h3>
              <p className="text-[11px] text-slate-500 truncate">
                OpenAI, OpenRouter, Ollama, LM Studio, or Groq
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="submit"
              form="llm-settings-form"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form with scrollable body and pinned footer */}
        <form id="llm-settings-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
            {/* Provider Preset Buttons */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Provider Preset
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'openrouter', label: 'OpenRouter' },
                  { id: 'groq', label: 'Groq' },
                  { id: 'ollama', label: 'Ollama (Local)' },
                  { id: 'lmstudio', label: 'LM Studio' },
                  { id: 'custom', label: 'Custom URL' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProviderSelect(p.id as LLMConfig['provider'])}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                      formData.provider === p.id
                        ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-1 ring-blue-500 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                API Base URL
              </label>
              <input
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* API Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  API Key
                </label>
                {formData.apiKey && (
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 transition-colors"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied to clipboard' : 'Copy Key'}</span>
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full text-xs p-2.5 pr-10 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {window.electronAPI ? 'Encrypted locally on disk via Windows DPAPI.' : 'Stored locally in your browser. Leave blank for local Ollama / LM Studio.'}
              </p>
            </div>

            {/* Model Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Model Name
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="gpt-4o, llama-3.3-70b-versatile, etc."
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-mono"
              />
            </div>

            {/* Test Connection Button & Status */}
            <div className="pt-1">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {testStatus === 'testing' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>Test Connection</span>
                </button>

                {testStatus === 'success' && (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Connected
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 text-xs text-rose-600 font-medium">
                    <AlertCircle className="w-4 h-4" /> Connection Failed
                  </span>
                )}
              </div>

              {testMessage && (
                <p className={`text-[11px] mt-1.5 ${testStatus === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {testMessage}
                </p>
              )}
            </div>

            {/* Application Version & Updates Section */}
            <div className="pt-2 border-t border-slate-200">
              <div className="bg-slate-50/90 rounded-xl p-3.5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <DownloadCloud className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">Application Updates</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          {CURRENT_APP_VERSION}
                        </span>
                        {window.electronAPI && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                            Desktop App
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">
                        Check GitHub repository for new releases
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCheckUpdate}
                    disabled={updateStatus === 'checking'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                    <span className="whitespace-nowrap">{updateStatus === 'checking' ? 'Checking...' : 'Check Updates'}</span>
                  </button>
                </div>

                {/* Status Display */}
                {updateStatus === 'up-to-date' && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>You're on the latest version ({updateInfo?.latestVersion || CURRENT_APP_VERSION})!</span>
                  </div>
                )}

                {updateStatus === 'available' && (
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <span>🎉</span>
                          <span>New Version Available: {updateInfo?.latestVersion}</span>
                        </p>
                        <p className="text-[11px] text-blue-700 truncate">
                          {window.electronAPI
                            ? 'One-click update will restart into the new version and preserve your active session.'
                            : 'Update now for the latest optimizations and ATS updates.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handlePerformUpdate}
                        disabled={isApplyingUpdate}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors shrink-0 disabled:opacity-60"
                      >
                        {isApplyingUpdate ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : window.electronAPI ? (
                          <DownloadCloud className="w-3.5 h-3.5" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {isApplyingUpdate
                            ? 'Updating...'
                            : window.electronAPI
                            ? 'Update & Restart'
                            : 'Get Update'}
                        </span>
                      </button>
                    </div>

                    {isApplyingUpdate && (
                      <div className="space-y-1.5 pt-1">
                        <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(5, updatePercent)}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-blue-800 font-medium">
                          {updateProgressText}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {updateStatus === 'error' && (
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span className="truncate">{updateError || 'Unable to check GitHub repository.'}</span>
                  </div>
                )}

                {/* Working Directory / Drafts Folder (Electron) */}
                {window.electronAPI && (
                  <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-600">
                    <span>Working Resume Copies:</span>
                    <button
                      type="button"
                      onClick={handleOpenDraftsFolder}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      title="Open Documents\Resume ATS Improver\Drafts in Windows File Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open Drafts Folder</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pinned Modal Actions Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/70 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
