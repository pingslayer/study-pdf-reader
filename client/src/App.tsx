import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { StudySettingsModal } from './components/Controls/StudySettingsModal';
import { ApiKeyModal } from './components/Controls/ApiKeyModal';
import { PageLayoutData, StudySettings } from './types/pdf';
import { pdfService } from './services/pdfService';
import { Library, Document } from './components/Library';
import { ttsPlayer } from './services/ttsClient';
import { filterReadableBlocks } from './services/studySettings';
import { usePlaybackEngine } from './hooks/usePlaybackEngine';

export const App: React.FC = () => {
  // Document state
  const [fileName, setFileName] = useState('OSTEP_Chapter4_Processes.pdf');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLayout, setCurrentPageLayout] = useState<PageLayoutData | null>(null);
  const [scale, setScale] = useState(1.15);
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorMode, setInspectorMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);

  // Backend & Voice state
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
  const [activeProvider, setActiveProvider] = useState<'edge' | 'elevenlabs'>('edge');
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string }>>([
    { id: 'en-US-AvaMultilingualNeural', name: 'Ava (Conversational, Expressive Female)' },
    { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew (Warm, Narrative Male)' },
    { id: 'en-US-GuyNeural', name: 'Guy (Natural, Expressive Male)' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Natural, Friendly Female)' },
  ]);
  const [selectedVoice, setSelectedVoice] = useState('en-US-AvaMultilingualNeural');

  // Study Settings: continuous reading without stopping (skip only running headers & page numbers)
  const [studySettings, setStudySettings] = useState<StudySettings>({
    pauseAtHeading: false,
    pauseAtFigure: false,
    pauseAtCode: false,
    skipCodeBlocks: false, // Reads code blocks; user can skip anytime by clicking next block
    skipDiagrams: false,   // Reads diagram labels; skips only non-textual images
    skipPageNumbers: true, // Skips standalone page numbers
    skipHeadersFooters: true, // Skips running header book titles
    readCaptions: true,
    readEquations: true,
    readCodeLiterally: true, // Reads code line-by-line with word highlights continuously
  });

  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Filter readable blocks on current page based on active study settings
  const readableBlocks = useMemo(() => {
    if (!currentPageLayout) return [];
    return filterReadableBlocks(currentPageLayout.blocks, studySettings);
  }, [currentPageLayout, studySettings]);

  // Sync reading progress to SQLite library database
  const syncProgress = useCallback(
    (page: number) => {
      if (activeDocument) {
        fetch(`http://localhost:3001/api/library/${activeDocument.id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ last_read_page: page }),
        }).catch(console.error);
      }
    },
    [activeDocument]
  );

  // Page navigation
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        playback.resetPlayback();
        setCurrentPage(page);
        syncProgress(page);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [numPages, syncProgress]
  );

  // Centralized Playback Engine (Strict FSM, Dual-Clock Sync, and Epoch Protection)
  const playback = usePlaybackEngine({
    readableBlocks,
    selectedVoice,
    speed,
    volume,
    studySettings,
    currentPage,
    numPages,
    onPageChange: handlePageChange,
  });

  // Check backend health & voices on mount
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setIsBackendConnected(true);
        setHasElevenLabsKey(Boolean(data.elevenlabs_configured));
        if (data.active_provider) {
          setActiveProvider(data.active_provider);
        }
      })
      .catch((err) => {
        console.warn('Backend not detected or offline:', err);
      });

    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && data.voices.length > 0) {
          setAvailableVoices(data.voices);
          setSelectedVoice(data.voices[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleElevenLabsConfigured = useCallback(() => {
    setHasElevenLabsKey(true);
    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && data.voices.length > 0) {
          setAvailableVoices(data.voices);
          setSelectedVoice(data.voices[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Load initial sample document
  const loadLibraryDocument = useCallback(
    async (doc: Document) => {
      playback.resetPlayback();

      try {
        const res = await fetch(`http://localhost:3001/api/library/${doc.id}/file`);
        if (!res.ok) throw new Error('Failed to load file');
        const buffer = await res.arrayBuffer();

        const total = await pdfService.loadDocument(buffer);
        setNumPages(total);
        setFileName(doc.original_name);

        const startPage = Math.min(Math.max(1, doc.last_read_page), total);
        setCurrentPage(startPage);

        const layout = await pdfService.getPageLayout(startPage);
        setCurrentPageLayout(layout);

        setActiveDocument(doc);
      } catch (err) {
        console.error('Failed to load PDF document:', err);
        alert('Failed to load PDF document: ' + (err as any).message);
      }
    },
    [playback]
  );

  const loadDocumentFromSource = useCallback(
    async (source: string | ArrayBuffer, name: string) => {
      playback.resetPlayback();

      try {
        const total = await pdfService.loadDocument(source);
        setNumPages(total);
        setFileName(name);
        setCurrentPage(1);

        const layout = await pdfService.getPageLayout(1);
        setCurrentPageLayout(layout);
      } catch (err) {
        console.error('Failed to load PDF document:', err);
        alert('Failed to load PDF document: ' + (err as any).message);
      }
    },
    [playback]
  );

  // Load layout whenever current page changes
  useEffect(() => {
    if (currentPage > 0 && numPages > 0) {
      pdfService.getPageLayout(currentPage).then((layout) => {
        setCurrentPageLayout(layout);
      });
    }
  }, [currentPage, numPages]);

  // Handle user uploading custom PDF
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('http://localhost:3001/api/library/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const doc = await res.json();
        loadLibraryDocument(doc);
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  // Handle loading sample OSTEP chapter
  const handleLoadSample = () => {
    loadDocumentFromSource('/samples/ostep_sample.pdf', 'OSTEP_Chapter4_Processes.pdf');
  };

  // Voice change with cache invalidation
  const handleVoiceChange = useCallback(
    (newVoice: string) => {
      playback.clearPrefetchCache();
      setSelectedVoice(newVoice);
    },
    [playback]
  );

  // Speed change
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    ttsPlayer.setSpeed(newSpeed);
  };

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    ttsPlayer.setVolume(newVol);
  };

  // Fit Width & Fit Page scale calculations
  const handleFitWidth = useCallback(() => {
    if (!currentPageLayout) return;
    const availableWidth = window.innerWidth - (sidebarOpen ? 320 : 56) - 64;
    const pageWidth = currentPageLayout.width || 595;
    setScale(Math.round(Math.max(0.4, Math.min(2.5, availableWidth / pageWidth)) * 100) / 100);
  }, [currentPageLayout, sidebarOpen]);

  const handleFitPage = useCallback(() => {
    if (!currentPageLayout) return;
    const availableHeight = window.innerHeight - 64;
    const pageHeight = currentPageLayout.height || 842;
    setScale(Math.round(Math.max(0.4, Math.min(2.5, availableHeight / pageHeight)) * 100) / 100);
  }, [currentPageLayout]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (playback.isPlaying || playback.isBuffering) {
          playback.pause();
        } else {
          playback.play();
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      } else if (e.key === 'i' || e.key === 'I') {
        setInspectorMode((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playback, handlePageChange, currentPage]);

  const currentBlockIndex = playback.activeBlock
    ? readableBlocks.findIndex((b) => b.id === playback.activeBlock?.id)
    : -1;

  // Back to Library
  const handleBackToLibrary = () => {
    playback.stop();
    setActiveDocument(null);
  };

  if (!activeDocument) {
    return <Library onDocumentSelect={loadLibraryDocument} />;
  }

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Unified All-in-One Control Sidebar */}
      <Sidebar
        onFileUpload={handleFileUpload}
        onLoadSample={handleLoadSample}
        onOpenSettings={() => setSettingsOpen(true)}
        isBackendConnected={isBackendConnected}
        activeProvider={activeProvider}
        isPlaying={playback.isPlaying}
        isBuffering={playback.isBuffering}
        speed={speed}
        volume={volume}
        selectedVoice={selectedVoice}
        availableVoices={availableVoices}
        activeBlock={playback.activeBlock}
        totalBlocks={readableBlocks.length}
        currentBlockIndex={currentBlockIndex}
        onPlay={playback.play}
        onPause={playback.pause}
        onStop={playback.stop}
        onPrevBlock={playback.prevBlock}
        onNextBlock={playback.nextBlock}
        onSpeedChange={handleSpeedChange}
        onVoiceChange={handleVoiceChange}
        onVolumeChange={handleVolumeChange}
        numPages={numPages}
        currentPage={currentPage}
        scale={scale}
        onSelectPage={handlePageChange}
        onScaleChange={setScale}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        currentPageLayout={currentPageLayout}
        onSelectBlock={playback.selectBlock}
        isOpen={sidebarOpen}
        onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        onBackToLibrary={handleBackToLibrary}
        activeDocumentId={activeDocument?.id || null}
      />

      {/* Network / Offline Error Notification Banner */}
      {playback.networkError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 bg-rose-950/95 border border-rose-500/60 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs animate-in fade-in slide-in-from-top-2 duration-200 select-none">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium max-w-md truncate">{playback.networkError}</span>
          <button
            onClick={() => {
              playback.clearError();
              playback.play();
            }}
            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 active:scale-95 text-white rounded-md font-semibold transition shadow-sm ml-1 shrink-0"
          >
            Retry
          </button>
          <button
            onClick={playback.clearError}
            className="p-1 text-rose-400 hover:text-white transition ml-1 shrink-0"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 100% Vertical Height Unobstructed PDF Viewport */}
      <PDFViewer
        fileName={fileName}
        currentPage={currentPage}
        numPages={numPages}
        currentPageLayout={currentPageLayout}
        activeBlock={playback.activeBlock}
        activeHighlight={playback.activeHighlight}
        inspectorMode={inspectorMode}
        scale={scale}
        onSelectBlock={playback.selectBlock}
      />

      {/* Study Settings Modal */}
      <StudySettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={studySettings}
        onUpdateSettings={setStudySettings}
      />

      {/* ElevenLabs API Key Modal */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
        onConfigured={handleElevenLabsConfigured}
        currentConfigured={hasElevenLabsKey}
      />
    </div>
  );
};
