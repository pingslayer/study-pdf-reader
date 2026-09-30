import React, { useState } from 'react';
import { Sparkles, X, CheckCircle, ExternalLink, Loader2, Cpu } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: () => void;
  currentConfigured: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
  currentConfigured,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSelectProvider = async (provider: 'edge' | 'elevenlabs') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      if (!res.ok) throw new Error('Failed to switch provider');
      onConfigured();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch provider');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveElevenLabs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your ElevenLabs API Key');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/config/elevenlabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to configure API key');
      }

      setSuccess(true);
      setTimeout(() => {
        onConfigured();
        onClose();
        setSuccess(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-white">TTS Voice Engine</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Active Free Provider: Edge Neural TTS */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-800/60 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white">Edge Neural TTS</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono font-medium">
                    ACTIVE • FREE
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  High-fidelity neural voices with <strong>sub-millisecond word boundary timestamps</strong>.
                  100% free, unlimited, with zero API key required and no quota limits.
                </p>
                <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-medium">Voices:</span> Guy, Jenny, Christopher, Aria, Eric, Ryan, Sonia
                </div>
              </div>
            </div>
          </div>

          {/* ElevenLabs Provider (Standby) */}
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-semibold text-white">ElevenLabs Neural Voice</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  STANDBY
                </span>
              </div>
              {currentConfigured && (
                <button
                  type="button"
                  onClick={() => handleSelectProvider('elevenlabs')}
                  disabled={loading}
                  className="px-2.5 py-1 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-md transition"
                >
                  Switch to ElevenLabs
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Kept on standby. You can enter or update your key below whenever you want to use ElevenLabs.
            </p>

            <form onSubmit={handleSaveElevenLabs} className="space-y-3">
              <div>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste ElevenLabs xi-api-key..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-md bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-2.5 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4" />
                  <span>ElevenLabs Key Saved!</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://elevenlabs.io/app/speech-synthesis"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-sky-400 transition"
                >
                  <span>ElevenLabs Dashboard</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="submit"
                  disabled={loading || !apiKey.trim()}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-medium rounded-lg border border-slate-700 transition"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Save Key</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
