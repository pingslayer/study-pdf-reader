import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  BookOpen,
  Code,
  Hash,
  Image as ImageIcon,
  Calculator,
  FileText,
  Mic,
  Gauge,
  Loader2,
} from 'lucide-react';
import { PageLayoutData, PDFBlock, BlockType } from '../types/pdf';

interface SidebarProps {
  // Document actions & server status
  onFileUpload: (file: File) => void;
  onOpenSettings: () => void;
  onLoadSample?: () => void;
  isBackendConnected?: boolean;
  activeProvider?: 'edge' | 'elevenlabs';

  // Playback state & controls
  isPlaying: boolean;
  isBuffering?: boolean;
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

  // Layout state
  isOpen: boolean;
  onToggleOpen: () => void;
  
  // Library & Bookmarks
  onBackToLibrary: () => void;
  activeDocumentId: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onFileUpload,
  onOpenSettings,
  isPlaying,
  isBuffering = false,
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
  isOpen,
  onToggleOpen,
  onBackToLibrary,
  activeDocumentId,
}) => {
  const [pageInput, setPageInput] = useState(String(currentPage));

  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);

  useEffect(() => {
    if (activeDocumentId) {
      fetch(`http://localhost:3001/api/bookmarks/${activeDocumentId}`)
        .then(res => res.json())
        .then(data => setBookmarks(data))
        .catch(console.error);
    }
  }, [activeDocumentId]);

  const handleAddBookmark = () => {
    if (!activeDocumentId) return;
    fetch(`http://localhost:3001/api/bookmarks/${activeDocumentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_number: currentPage, title: `Page ${currentPage}` })
    })
    .then(res => res.json())
    .then(b => setBookmarks([...bookmarks, b]))
    .catch(console.error);
  };

  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    fetch(`http://localhost:3001/api/bookmarks/${id}`, { method: 'DELETE' })
      .then(() => setBookmarks(bookmarks.filter(b => b.id !== id)))
      .catch(console.error);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const handlePageInputSubmit = () => {
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= (numPages || 1)) {
      onSelectPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

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
        <div className="flex flex-col items-center space-y-3.5">
          <button
            onClick={onToggleOpen}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition shadow"
            title="Expand Controls Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={isPlaying || isBuffering ? onPause : onPlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isBuffering
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse hover:bg-zinc-700'
                : isPlaying
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/40 ring-2 ring-amber-500/20'
                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/20 hover:scale-105 active:scale-95'
            }`}
            title={isBuffering ? 'Buffering Audio (Click to Cancel)...' : isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          {/* Quick Page Nav in Rail */}
          <div className="flex flex-col items-center space-y-1 pt-2 border-t border-zinc-800/80 w-full px-1">
            <button
              onClick={() => onSelectPage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-[11px] font-mono text-zinc-300 font-semibold">
              {currentPage}
            </span>

            <button
              onClick={() => onSelectPage(Math.min(numPages || 1, currentPage + 1))}
              disabled={currentPage >= numPages}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Zoom / Fit in Rail */}
          <div className="flex flex-col items-center space-y-1 pt-2 border-t border-zinc-800/80 w-full px-1">
            <button
              onClick={onFitWidth}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition"
              title="Fit to Width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onScaleChange(Math.min(2.5, Math.round((scale + 0.1) * 10) / 10))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onScaleChange(Math.max(0.4, Math.round((scale - 0.1) * 10) / 10))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
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


      <div className="px-3 py-2 border-b border-zinc-800/80 bg-zinc-950/40">
        <div className="flex items-center justify-between">
          <button onClick={onBackToLibrary} className="flex items-center text-xs font-medium text-zinc-400 hover:text-amber-400 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Library
          </button>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleAddBookmark}
              className="p-1.5 rounded text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/50 transition-colors"
              title="Bookmark Current Page"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Document Navigation & View Deck */}
      <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 space-y-2">
        {/* Row 1: Unified Page Controller */}
        <div className="flex items-center justify-between bg-zinc-950/70 border border-zinc-800 rounded-lg p-1 shadow-inner">
          <button
            onClick={() => onSelectPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-20 transition active:scale-95"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs select-none">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Page</span>
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePageInputSubmit();
              }}
              onBlur={handlePageInputSubmit}
              className="w-10 h-6 bg-zinc-900 border border-zinc-700/60 rounded text-center text-xs font-mono font-semibold text-zinc-100 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/20 transition selection:bg-amber-500 selection:text-zinc-950 shadow-sm"
              title="Type page number and press Enter"
            />
            <span className="text-zinc-500 text-[11px] font-medium">of</span>
            <span className="text-zinc-300 font-mono font-semibold text-xs">{numPages || 1}</span>
          </div>

          <button
            onClick={() => onSelectPage(Math.min(numPages || 1, currentPage + 1))}
            disabled={currentPage >= numPages}
            className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 disabled:opacity-20 transition active:scale-95"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Unified Zoom & Fit Deck */}
        <div className="flex items-center gap-1.5">
          {/* Stepper Zoom */}
          <div className="flex-1 flex items-center justify-between bg-zinc-950/70 border border-zinc-800 rounded-lg p-0.5 h-8 shadow-inner">
            <button
              onClick={() => onScaleChange(Math.max(0.4, Math.round((scale - 0.1) * 10) / 10))}
              className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition active:scale-95"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onScaleChange(1.0)}
              className="flex-1 text-center font-mono text-xs font-medium text-zinc-300 hover:text-amber-400 transition"
              title="Click to reset to 100%"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={() => onScaleChange(Math.min(2.5, Math.round((scale + 0.1) * 10) / 10))}
              className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition active:scale-95"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit Actions Segment */}
          <div className="flex items-center bg-zinc-950/70 border border-zinc-800 rounded-lg p-0.5 h-8 shadow-inner">
            <button
              onClick={onFitWidth}
              className="flex items-center space-x-1.5 px-2.5 h-7 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition font-medium active:scale-95"
              title="Fit to Window Width"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Width</span>
            </button>
            <div className="w-[1px] h-4 bg-zinc-800/90" />
            <button
              onClick={onFitPage}
              className="flex items-center space-x-1.5 px-2.5 h-7 rounded text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition font-medium active:scale-95"
              title="Fit Entire Page"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="text-[11px]">Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Hero Playback Console */}
      <div className="p-3.5 border-b border-zinc-800/80 bg-zinc-900/40 space-y-2.5">
        {/* Playback Progress Tracker */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="truncate max-w-[170px] font-medium">
              {isBuffering ? (
                <span className="text-amber-400 flex items-center space-x-1.5 animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                  BUFFERING AUDIO...
                </span>
              ) : activeBlock ? (
                <span className="text-zinc-300">
                  {`${activeBlock.type.toUpperCase()}${activeBlock.languageHint ? ` • ${activeBlock.languageHint}` : ''}`}
                </span>
              ) : (
                <span className="text-zinc-300">READY TO READ</span>
              )}
            </span>
            <span className="text-zinc-500 font-semibold">
              {currentBlockIndex >= 0 ? `${currentBlockIndex + 1} / ${totalBlocks}` : `${totalBlocks} BLOCKS`}
            </span>
          </div>

          {/* Slim progress bar track */}
          <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${isBuffering ? 'bg-amber-400 animate-pulse' : 'bg-amber-500'}`}
              style={{
                width: `${totalBlocks > 0 && currentBlockIndex >= 0 ? Math.round(((currentBlockIndex + 1) / totalBlocks) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Primary Playback Deck (Prev, Play/Pause Hero, Next, Stop) */}
        <div className="flex items-center justify-center space-x-4 py-0.5">
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
            onClick={isPlaying || isBuffering ? onPause : onPlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg shrink-0 ${
              isBuffering
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse hover:bg-zinc-700'
                : isPlaying
                ? 'bg-zinc-800 text-amber-400 border border-amber-500/50 hover:bg-zinc-700 shadow-amber-500/10'
                : 'bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-105 shadow-amber-500/25 active:scale-95'
            }`}
            title={isBuffering ? 'Buffering Audio (Click to Cancel)...' : isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            ) : isPlaying ? (
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

        {/* Unified Pro Audio Deck */}
        <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg h-8 shadow-inner flex items-center divide-x divide-zinc-800/80 overflow-hidden">
          {/* Segment 1: Voice Selector */}
          <div className="relative flex-1 min-w-0 flex items-center px-2.5 h-full group hover:bg-zinc-900/60 transition cursor-pointer">
            <Mic className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 shrink-0 mr-1.5 transition-colors" />
            <span className="text-xs text-zinc-300 font-medium truncate flex-1 select-none">
              {availableVoices.find((v) => v.id === selectedVoice)?.name || selectedVoice || 'Select Voice'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-1 transition-colors" />
            <select
              value={selectedVoice}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Select Neural Voice"
            >
              {availableVoices.map((v) => (
                <option key={v.id} value={v.id} className="bg-zinc-900 text-zinc-200">
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {/* Segment 2: Speed Selector */}
          <div className="relative shrink-0 flex items-center px-2.5 h-full group hover:bg-zinc-900/60 transition cursor-pointer">
            <Gauge className="w-3.5 h-3.5 text-zinc-400 group-hover:text-amber-400 shrink-0 mr-1.5 transition-colors" />
            <span className="font-mono text-xs font-semibold text-zinc-300 group-hover:text-amber-400 transition-colors select-none">
              {speed.toFixed(2)}x
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-1 transition-colors" />
            <select
              value={speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer font-mono"
              title="Select Narration Speed"
            >
              {speedOptions.map((s) => (
                <option key={s} value={s} className="bg-zinc-900 text-zinc-200">
                  {s.toFixed(2)}x Speed
                </option>
              ))}
            </select>
          </div>

          {/* Segment 3: Volume & Mute */}
          <div className="shrink-0 flex items-center px-2.5 h-full space-x-1.5">
            <button
              onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
              className="text-zinc-400 hover:text-zinc-100 transition active:scale-95"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-12 h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400"
              title={`Volume: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>


      {/* Toggles */}
      <div className="flex border-b border-zinc-800/50">
        <button
          onClick={() => setShowBookmarks(false)}
          className={`flex-1 py-1.5 text-xs font-medium text-center transition-colors ${!showBookmarks ? 'text-amber-400 border-b border-amber-500 bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-950/30'}`}
        >
          Document
        </button>
        <button
          onClick={() => setShowBookmarks(true)}
          className={`flex-1 py-1.5 text-xs font-medium text-center transition-colors ${showBookmarks ? 'text-amber-400 border-b border-amber-500 bg-zinc-900/50' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-950/30'}`}
        >
          Bookmarks ({bookmarks.length})
        </button>
      </div>

      {/* 4. Scrollable Paragraph / Block Stream or Bookmarks */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {showBookmarks ? (
          <div className="space-y-1.5">
            {bookmarks.map(b => (
              <div key={b.id} onClick={() => onSelectPage(b.page_number)} className="flex items-center justify-between p-2 rounded-lg border border-zinc-800/60 bg-zinc-950/40 hover:bg-zinc-800/50 hover:border-zinc-700/60 cursor-pointer text-xs transition">
                <span className="text-zinc-300">{b.title}</span>
                <button onClick={(e) => handleDeleteBookmark(b.id, e)} className="text-zinc-500 hover:text-rose-400 p-1 rounded-md">
                  <Square className="w-3 h-3" />
                </button>
              </div>
            ))}
            {bookmarks.length === 0 && <div className="text-center text-zinc-500 py-8 text-xs">No bookmarks yet.</div>}
          </div>
        ) : (
          blocks.length === 0 ? (
            <div className="text-center py-12 text-xs text-zinc-500 select-none">
              No readable text blocks on page {currentPage}
            </div>
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
        )}
      </div>
    </aside>
  );
};
