import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  ListOrdered,
  Code,
  Hash,
  Image as ImageIcon,
  Calculator,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { PageLayoutData, PDFBlock, BlockType } from '../types/pdf';

interface SidebarProps {
  // Document actions & server status
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  onOpenSettings: () => void;
  isBackendConnected: boolean;
  activeProvider: 'edge' | 'elevenlabs';

  // Playback state & controls
  isPlaying: boolean;
  speed: number;
  volume: number;
  selectedVoice: string;
  availableVoices: Array<{ id: string; name: string }>;
  activeBlock: PDFBlock | null;
  totalBlocks: number;
  currentBlockIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevBlock: () => void;
  onNextBlock: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voice: string) => void;
  onVolumeChange: (vol: number) => void;

  // Page & Zoom Navigation
  numPages: number;
  currentPage: number;
  scale: number;
  onSelectPage: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;

  // Content Navigation
  currentPageLayout: PageLayoutData | null;
  onSelectBlock: (block: PDFBlock) => void;

  // Code mode
  readCodeLiterally: boolean;
  onToggleCodeLiterally: () => void;

  // Layout state
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onFileUpload,
  onLoadSample,
  onOpenSettings,
  isBackendConnected,
  activeProvider,
  isPlaying,
  speed,
  volume,
  selectedVoice,
  availableVoices,
  activeBlock,
  totalBlocks,
  currentBlockIndex,
  onPlay,
  onPause,
  onStop,
  onPrevBlock,
  onNextBlock,
  onSpeedChange,
  onVoiceChange,
  onVolumeChange,
  numPages,
  currentPage,
  scale,
  onSelectPage,
  onScaleChange,
  onFitWidth,
  onFitPage,
  currentPageLayout,
  onSelectBlock,
  readCodeLiterally,
  onToggleCodeLiterally,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'blocks' | 'pages'>('blocks');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'code':
        return <Code className="w-3.5 h-3.5 text-emerald-400" />;
      case 'caption':
      case 'figure':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-400" />;
      case 'equation':
        return <Calculator className="w-3.5 h-3.5 text-rose-400" />;
      case 'heading':
        return <Hash className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const speedOptions = [0.8, 1.0, 1.25, 1.5, 2.0];
  const blocks = (currentPageLayout?.blocks || []).filter((b) => !b.isFiltered);

  // ── COLLAPSED RAIL VIEW ──────────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <aside className="w-14 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 justify-between z-20 select-none shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onToggleOpen}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition shadow"
            title="Expand Controls Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isPlaying
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/40 ring-2 ring-amber-500/20'
                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/20 hover:scale-105 active:scale-95'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => onSelectPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="text-[11px] font-mono text-zinc-400">
            {currentPage}/{numPages || 1}
          </span>

          <button
            onClick={() => onSelectPage(Math.min(numPages || 1, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Open PDF Document"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Reading Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // ── EXPANDED FULL SIDEBAR VIEW ──────────────────────────────────────────────────
  return (
    <aside className="w-80 bg-zinc-900 border-r border-zinc-800/90 flex flex-col h-full z-20 select-none shadow-2xl overflow-hidden">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Header Toolbar */}
      <div className="px-4 py-3.5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-zinc-100">StudyPDF Reader</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Open Local PDF File"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Study Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleOpen}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Hero Playback Console */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 space-y-3">
        {/* Playback Progress Tracker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="truncate max-w-[170px] text-zinc-300 font-medium">
              {activeBlock
                ? `${activeBlock.type.toUpperCase()}${activeBlock.languageHint ? ` • ${activeBlock.languageHint}` : ''}`
                : 'READY TO READ'}
            </span>
            <span className="text-zinc-500 font-semibold">
              {currentBlockIndex >= 0 ? `${currentBlockIndex + 1} / ${totalBlocks}` : `${totalBlocks} BLOCKS`}
            </span>
          </div>

          {/* Slim progress bar track */}
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300 rounded-full"
              style={{
                width: `${totalBlocks > 0 && currentBlockIndex >= 0 ? Math.round(((currentBlockIndex + 1) / totalBlocks) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Primary Playback Deck (Prev, Play/Pause Hero, Next, Stop) */}
        <div className="flex items-center justify-center space-x-4 py-1">
          {/* Previous Block */}
          <button
            onClick={onPrevBlock}
            disabled={currentBlockIndex <= 0}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
            title="Previous Block"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Central Hero Play / Pause Button - Fixed 48x48px (ZERO JITTER) */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg shrink-0 ${
              isPlaying
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/50 hover:bg-zinc-700 shadow-amber-500/10'
                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-105 shadow-amber-500/25 active:scale-95'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Next Block */}
          <button
            onClick={onNextBlock}
            disabled={totalBlocks > 0 && currentBlockIndex >= totalBlocks - 1}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
            title="Next Block"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Stop / Reset */}
          <button
            onClick={onStop}
            className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
            title="Stop Narration"
          >
            <Square className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Speed Pills */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Narration Speed</span>
            <span className="text-amber-400 font-mono font-medium">{speed.toFixed(2)}x</span>
          </div>
          <div className="grid grid-cols-5 gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800/80">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`py-1 text-[11px] font-mono rounded transition ${
                  Math.abs(speed - s) < 0.05
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] text-zinc-400 block">Neural Voice</label>
          <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/80 transition"
          >
            {availableVoices.map((v) => (
              <option key={v.id} value={v.id} className="bg-zinc-900 text-zinc-200">
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Volume & Code Reading Mode */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2 text-zinc-400">
            <button
              onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
              className="hover:text-zinc-200 transition"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-300" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <button
            onClick={onToggleCodeLiterally}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition flex items-center space-x-1 ${
              readCodeLiterally
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-400'
            }`}
            title="Toggle: Read code literally character-by-character vs summarized"
          >
            <Code className="w-3 h-3" />
            <span>{readCodeLiterally ? 'Literal Code' : 'Summarized'}</span>
          </button>
        </div>
      </div>

      {/* 3. Page & Zoom Navigation Controls */}
      <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
        {/* Page Switcher */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSelectPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center space-x-1 text-xs font-mono">
            <span className="text-zinc-200 font-semibold">{currentPage}</span>
            <span className="text-zinc-500">/</span>
            <span className="text-zinc-400">{numPages || 1}</span>
          </div>
          <button
            onClick={() => onSelectPage(Math.min(numPages || 1, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Fit Actions */}
        <div className="flex items-center space-x-1 bg-zinc-950/60 p-0.5 rounded-lg border border-zinc-800">
          <button
            onClick={() => onScaleChange(Math.max(0.4, Math.round((scale - 0.1) * 10) / 10))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1 text-[11px] font-mono text-zinc-300">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => onScaleChange(Math.min(2.5, Math.round((scale + 0.1) * 10) / 10))}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitWidth}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
            title="Fit to Width"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFitPage}
            className="px-1 py-0.5 rounded hover:bg-zinc-800 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 transition"
            title="Fit to Page"
          >
            Fit
          </button>
        </div>
      </div>

      {/* 4. Tab Switcher for Content Navigator */}
      <div className="px-4 py-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800/80 text-xs w-full">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded-md font-medium transition ${
              activeTab === 'blocks'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
            <span>Paragraphs</span>
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-1 rounded-md font-medium transition ${
              activeTab === 'pages'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Pages</span>
          </button>
        </div>
      </div>

      {/* 5. Scrollable Paragraph / Page List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {activeTab === 'blocks' ? (
          blocks.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">No readable blocks on this page</div>
          ) : (
            blocks.map((b, idx) => {
              const isActive = activeBlock?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBlock(b)}
                  className={`group p-2.5 rounded-lg border text-xs cursor-pointer transition flex items-start space-x-2.5 ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                      : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700/60'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">{getBlockIcon(b.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                        {b.type} #{idx + 1}
                      </span>
                      {isActive && isPlaying && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-zinc-400 group-hover:text-zinc-200 text-[11px] leading-relaxed">
                      {b.text.slice(0, 110)}
                    </p>
                  </div>
                </div>
              );
            })
          )
        ) : (
          <div className="grid grid-cols-2 gap-2 p-1">
            {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onSelectPage(p)}
                className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center space-y-1 ${
                  currentPage === p
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold'
                    : 'bg-zinc-950/40 border-zinc-800/70 text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
              >
                <span className="text-xs">Page</span>
                <span className="font-mono text-base font-bold">{p}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 6. Footer Utility Bar */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between text-xs text-zinc-500">
        <button
          onClick={onLoadSample}
          className="hover:text-zinc-300 transition flex items-center space-x-1"
          title="Reload OSTEP Textbook Sample"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Sample</span>
        </button>
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-zinc-400">{activeProvider === 'elevenlabs' ? 'ElevenLabs' : 'Edge TTS'}</span>
        </div>
      </div>
    </aside>
  );
};
