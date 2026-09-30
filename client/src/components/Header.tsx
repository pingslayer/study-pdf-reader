import React, { useRef } from 'react';
import { BookOpen, Upload, Settings, Eye, CheckCircle2, FileText } from 'lucide-react';

interface HeaderProps {
  fileName: string;
  inspectorMode: boolean;
  onToggleInspector: () => void;
  onOpenSettings: () => void;
  onOpenApiKeyModal?: () => void;
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  isBackendConnected: boolean;
  hasElevenLabsKey: boolean;
  activeProvider?: 'edge' | 'elevenlabs';
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  inspectorMode,
  onToggleInspector,
  onOpenSettings,
  onOpenApiKeyModal,
  onFileUpload,
  onLoadSample,
  isBackendConnected,
  hasElevenLabsKey: _hasElevenLabsKey,
  activeProvider = 'edge',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-20">
      {/* Brand & Document Name */}
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-sm font-bold text-white tracking-tight">StudyPDF Reader</h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
              OSTEP Edition
            </span>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="truncate max-w-[280px]" title={fileName}>
              {fileName}
            </span>
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-md border border-slate-700 transition"
          title="Upload your own PDF document"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>Upload PDF</span>
        </button>

        <button
          onClick={onLoadSample}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 active:bg-sky-800 rounded-md border border-sky-800/80 transition"
          title="Load built-in OSTEP technical textbook sample"
        >
          <span>Sample OSTEP Chapter</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Inspector Mode Toggle */}
        <button
          onClick={onToggleInspector}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition ${
            inspectorMode
              ? 'bg-purple-950/80 text-purple-300 border-purple-700 ring-1 ring-purple-600'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Toggle visual layout inspector to see detected blocks (Headings, Code, Equations, Captions, Headers/Footers)"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspector</span>
          {inspectorMode && (
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          )}
        </button>

        {/* Study Settings Button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition"
          title="Configure study pause points and reading options"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span>Study Controls</span>
        </button>

        {/* Backend & TTS Status Pill */}
        <button
          onClick={onOpenApiKeyModal}
          className={`flex items-center space-x-1.5 px-2.5 py-1 text-[11px] rounded-full border transition cursor-pointer hover:opacity-90 active:scale-95 ${
            !isBackendConnected
              ? 'bg-rose-950/60 text-rose-400 border-rose-800'
              : activeProvider === 'edge'
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60'
              : 'bg-sky-950/60 text-sky-400 border-sky-800 hover:bg-sky-900/60'
          }`}
          title={
            activeProvider === 'edge'
              ? 'Edge Neural TTS Active (Free & Unlimited with word timestamps). Click to configure ElevenLabs.'
              : 'ElevenLabs Active. Click to configure.'
          }
        >
          {!isBackendConnected ? (
            <span>Server Offline</span>
          ) : activeProvider === 'edge' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Edge Neural (Free)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-sky-400" />
              <span>ElevenLabs Active</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
