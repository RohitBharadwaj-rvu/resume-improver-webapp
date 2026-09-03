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
} from 'lucide-react';
import { checkGitHubUpdate, type AppUpdateInfo, CURRENT_APP_VERSION } from '../services/updater';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LLMConfig;
  onSave: (config: LLMConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [formData, setFormData] = useState<LLMConfig>(config);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'up-to-date' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                OpenAI-Compatible LLM Settings
              </h3>
              <p className="text-xs text-slate-500">
                Connect OpenAI, OpenRouter, Ollama, LM Studio, or Groq
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  onClick={() => handleProviderSelect(p.id as any)}
                  className={`px-2 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                    formData.provider === p.id
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
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
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              API Key
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 bg-white font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Stored locally in your browser. Leave blank for local Ollama / LM Studio.
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
          <div className="pt-2">
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

          {/* Desktop App & Updates Section */}
          <div className="pt-3 border-t border-slate-200">
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Application Version &amp; Updates
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                    {CURRENT_APP_VERSION}
                  </span>
                  {window.electronAPI && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                      Desktop App
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={updateStatus === 'checking'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                  <span>{updateStatus === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
                </button>
              </div>

              {/* Status Display */}
              {updateStatus === 'up-to-date' && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>You're on the latest version ({updateInfo?.latestVersion || CURRENT_APP_VERSION})!</span>
                </div>
              )}

              {updateStatus === 'available' && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-blue-900">
                      🎉 New Version Available: {updateInfo?.latestVersion}
                    </p>
                    <p className="text-[11px] text-blue-700">
                      Update now to get the latest features and optimizations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenReleaseUrl}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Get Update</span>
                  </button>
                </div>
              )}

              {updateStatus === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{updateError || 'Unable to fetch update info from GitHub.'}</span>
                </div>
              )}

              {/* Working Directory / Drafts Folder (Electron) */}
              {window.electronAPI && (
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span>Resume Working Copies:</span>
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

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
