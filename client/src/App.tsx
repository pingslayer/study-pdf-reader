import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { PlaybackBar } from './components/Controls/PlaybackBar';
import { StudySettingsModal } from './components/Controls/StudySettingsModal';
import { ApiKeyModal } from './components/Controls/ApiKeyModal';
import { PageLayoutData, PDFBlock, StudySettings, BoundingBox } from './types/pdf';
import { pdfService } from './services/pdfService';
import { ttsPlayer } from './services/ttsClient';
import { buildVisualTokensFromBlock, findMatchingVisualToken, VisualToken } from './services/textMapping';
import { convertCodeToSpokenText } from './services/codeSpokenCleaner';

export const App: React.FC = () => {
  // Document state
  const [fileName, setFileName] = useState('OSTEP_Chapter4_Processes.pdf');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageLayout, setCurrentPageLayout] = useState<PageLayoutData | null>(null);
  const [scale, setScale] = useState(1.15);

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
    { id: 'en-US-GuyNeural', name: 'Guy (Natural, Expressive Male)' },
    { id: 'en-US-JennyNeural', name: 'Jenny (Natural, Friendly Female)' },
    { id: 'en-US-ChristopherNeural', name: 'Christopher (Deep, Academic Male)' },
    { id: 'en-US-AriaNeural', name: 'Aria (Clear, Professional Female)' },
    { id: 'en-US-EricNeural', name: 'Eric (Conversational Male)' },
  ]);
  const [selectedVoice, setSelectedVoice] = useState('en-US-GuyNeural');

  // Study Settings (defaults optimized for continuous academic prose reading)
  const [studySettings, setStudySettings] = useState<StudySettings>({
    pauseAtHeading: false,
    pauseAtFigure: false,  // Default OFF: continuous reading across diagrams
    pauseAtCode: false,    // Default OFF: continuous reading across code
    skipCodeBlocks: true,  // Default ON: bypass code listings to maintain prose flow (like Coursera)
    skipDiagrams: true,    // Default ON: bypass floating diagram labels/arrows
    skipPageNumbers: true, // Default ON
    skipHeadersFooters: true, // Default ON
    readCaptions: true,    // Default ON: speak descriptive figure captions
    readEquations: false,  // Default OFF: avoid math symbol noise
    readCodeLiterally: false, // Default OFF
  });

  // Playback & Highlighting State
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBlock, setActiveBlock] = useState<PDFBlock | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<BoundingBox | null>(null);
  const [speed, setSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // References for active playback loop
  const visualTokensRef = useRef<VisualToken[]>([]);
  const lastMatchedTokenIndexRef = useRef<number>(0);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Always-current refs so stale closures inside audio callbacks can call
  // the latest version of these functions without being re-created every render.
  const handleNextBlockRef = useRef<() => void>(() => {});
  const playBlockNarrationRef = useRef<(block: PDFBlock) => void>(() => {});

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
  const loadDocumentFromSource = useCallback(async (source: string | ArrayBuffer, name: string) => {
    try {
      ttsPlayer.stop();
      setIsPlaying(false);
      setActiveBlock(null);
      setActiveHighlight(null);

      const total = await pdfService.loadDocument(source);
      setNumPages(total);
      setFileName(name);
      setCurrentPage(1);

      // Load layout for page 1
      const layout = await pdfService.getPageLayout(1);
      setCurrentPageLayout(layout);
    } catch (err) {
      console.error('Failed to load PDF document:', err);
      alert('Failed to load PDF document: ' + (err as any).message);
    }
  }, []);

  useEffect(() => {
    loadDocumentFromSource('/samples/ostep_sample.pdf', 'OSTEP_Chapter4_Processes.pdf');
  }, [loadDocumentFromSource]);

  // Load layout whenever current page changes
  useEffect(() => {
    if (currentPage > 0 && numPages > 0) {
      pdfService.getPageLayout(currentPage).then((layout) => {
        setCurrentPageLayout(layout);
        // Clear highlight if on a different page unless activeBlock is on this page
        setActiveBlock((prev) => (prev && prev.page === currentPage ? prev : null));
        setActiveHighlight((prev) => (prev ? null : null));
      });
    }
  }, [currentPage, numPages]);

  // Handle user uploading custom PDF
  const handleFileUpload = async (file: File) => {
    const buffer = await file.arrayBuffer();
    loadDocumentFromSource(buffer, file.name);
  };

  // Handle loading sample OSTEP chapter
  const handleLoadSample = () => {
    loadDocumentFromSource('/samples/ostep_sample.pdf', 'OSTEP_Chapter4_Processes.pdf');
  };

  // Select a block
  const handleSelectBlock = useCallback((block: PDFBlock) => {
    setActiveBlock(block);
    visualTokensRef.current = buildVisualTokensFromBlock(block);
    lastMatchedTokenIndexRef.current = 0;
    // Highlight the whole block immediately
    setActiveHighlight(block.bbox);
  }, []);

  // Helper: check if a block should be read according to current study settings
  const isBlockReadable = useCallback(
    (b: PDFBlock) => {
      if (b.isFiltered && studySettings.skipHeadersFooters) return false;
      if ((b.type === 'header' || b.type === 'footer') && studySettings.skipHeadersFooters) return false;
      if (b.type === 'figure' && studySettings.skipDiagrams) return false;
      if (b.type === 'code' && studySettings.skipCodeBlocks) return false;
      if (b.type === 'caption' && !studySettings.readCaptions) return false;
      if (b.type === 'equation' && !studySettings.readEquations) return false;
      return true;
    },
    [studySettings]
  );

  // Get readable blocks on current page based on study settings
  const getReadableBlocks = useCallback(() => {
    if (!currentPageLayout) return [];
    return currentPageLayout.blocks.filter(isBlockReadable);
  }, [currentPageLayout, isBlockReadable]);

  // Play narration of a specific block
  const playBlockNarration = useCallback(
    async (block: PDFBlock) => {
      handleSelectBlock(block);
      setIsPlaying(true);

      // 1. Prepare spoken text — join lines with spaces so the TTS engine
      //    does not interpret PDF line-breaks as sentence boundaries (which
      //    would create unnatural pauses mid-sentence).
      let spokenText = block.text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();

      if (block.type === 'code') {
        if (studySettings.readCodeLiterally) {
          spokenText = convertCodeToSpokenText(block.text);
        } else {
          spokenText = 'Code example. ' + (block.languageHint ? `${block.languageHint} code.` : '');
        }
      }

      try {
        const ttsData = await ttsPlayer.fetchTTS(spokenText, selectedVoice);

        ttsPlayer.playWithAlignment(
          ttsData,
          spokenText,
          speed,
          volume,
          (word: string, wordIndex: number, charIndex?: number) => {
            const match = findMatchingVisualToken(
              word,
              visualTokensRef.current,
              lastMatchedTokenIndexRef.current,
              charIndex,
              wordIndex
            );

            if (match) {
              lastMatchedTokenIndexRef.current = match.index;
              setActiveHighlight(match.token.bbox);
            }
          },
          () => {
            // Finished current block — use ref so this always calls the
            // latest handleNextBlock even though this closure was created
            // when the block started playing (stale closure fix).
            if (!isPlayingRef.current) return;

            // Look up the next block so we can decide whether to pause.
            // We only pause at the END of a code section (when the next block
            // is not also code), so a C program split across several blocks
            // flows continuously rather than stopping after the first chunk.
            const readableForPause = getReadableBlocks();
            const currIdx = readableForPause.findIndex((b) => b.id === block.id);
            const nextBlock = currIdx >= 0 ? readableForPause[currIdx + 1] : undefined;

            if (studySettings.pauseAtCode && block.type === 'code' && nextBlock?.type !== 'code') {
              setIsPlaying(false);
              return;
            }
            if (studySettings.pauseAtFigure && (block.type === 'caption' || block.type === 'figure')) {
              setIsPlaying(false);
              return;
            }
            if (studySettings.pauseAtHeading && block.type === 'heading') {
              setIsPlaying(false);
              return;
            }

            // Always-current via ref — never stale
            handleNextBlockRef.current();
          }
        );
      } catch (err: any) {
        console.warn('TTS block generation failed, skipping to next block:', err);
        if (isPlayingRef.current) {
          setTimeout(() => {
            if (isPlayingRef.current) {
              handleNextBlockRef.current();
            }
          }, 80);
        } else {
          setIsPlaying(false);
        }
      }
    },
    [handleSelectBlock, getReadableBlocks, selectedVoice, speed, volume, studySettings]
  );

  // Play button clicked
  const handlePlay = useCallback(() => {
    const readable = getReadableBlocks();
    if (readable.length === 0) return;

    if (activeBlock) {
      playBlockNarration(activeBlock);
    } else {
      playBlockNarration(readable[0]);
    }
  }, [getReadableBlocks, activeBlock, playBlockNarration]);

  // Pause
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    ttsPlayer.pause();
  }, []);

  // Stop
  const handleStop = useCallback(() => {
    setIsPlaying(false);
    ttsPlayer.stop();
    setActiveHighlight(null);
  }, []);

  // Advance to next block
  const handleNextBlock = useCallback(() => {
    const readable = getReadableBlocks();
    if (readable.length === 0) return;

    if (!activeBlock) {
      playBlockNarrationRef.current(readable[0]);
      return;
    }

    const currentIndex = readable.findIndex((b) => b.id === activeBlock.id);
    if (currentIndex >= 0 && currentIndex + 1 < readable.length) {
      playBlockNarrationRef.current(readable[currentIndex + 1]);
    } else if (currentPage < numPages) {
      // Advance to next page
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      pdfService.getPageLayout(nextPage).then((layout) => {
        setCurrentPageLayout(layout);
        const nextReadable = layout.blocks.filter(isBlockReadable);
        if (nextReadable.length > 0 && isPlayingRef.current) {
          playBlockNarrationRef.current(nextReadable[0]);
        }
      });
    } else {
      // End of document
      setIsPlaying(false);
      ttsPlayer.stop();
    }
  }, [getReadableBlocks, isBlockReadable, activeBlock, currentPage, numPages]);

  // Keep refs current every render so onEnded closures always have the latest functions
  playBlockNarrationRef.current = playBlockNarration;
  handleNextBlockRef.current = handleNextBlock;

  // Back to previous block
  const handlePrevBlock = useCallback(() => {
    const readable = getReadableBlocks();
    if (readable.length === 0) return;

    if (!activeBlock) {
      handleSelectBlock(readable[0]);
      return;
    }

    const currentIndex = readable.findIndex((b) => b.id === activeBlock.id);
    if (currentIndex > 0) {
      const prev = readable[currentIndex - 1];
      if (isPlaying) {
        playBlockNarration(prev);
      } else {
        handleSelectBlock(prev);
      }
    }
  }, [getReadableBlocks, activeBlock, isPlaying, playBlockNarration, handleSelectBlock]);

  // Page navigation
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        ttsPlayer.stop();
        setIsPlaying(false);
        setActiveBlock(null);
        setActiveHighlight(null);
        setCurrentPage(page);
      }
    },
    [numPages]
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

  // Toggle code literal reading
  const handleToggleCodeLiterally = () => {
    setStudySettings((prev) => ({
      ...prev,
      readCodeLiterally: !prev.readCodeLiterally,
    }));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePageChange(currentPage - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handlePageChange(currentPage + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, handlePause, handlePlay, handlePageChange, currentPage]);

  const readableBlocks = getReadableBlocks();
  const currentBlockIndex = activeBlock
    ? readableBlocks.findIndex((b) => b.id === activeBlock.id)
    : -1;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Header */}
      <Header
        fileName={fileName}
        inspectorMode={inspectorMode}
        onToggleInspector={() => setInspectorMode(!inspectorMode)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
        onFileUpload={handleFileUpload}
        onLoadSample={handleLoadSample}
        isBackendConnected={isBackendConnected}
        hasElevenLabsKey={hasElevenLabsKey}
        activeProvider={activeProvider}
      />

      {/* Main Workspace Area (Sidebar + PDF Viewer) */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          numPages={numPages}
          currentPage={currentPage}
          currentPageLayout={currentPageLayout}
          activeBlockId={activeBlock?.id || null}
          onSelectPage={handlePageChange}
          onSelectBlock={(b) => {
            if (isPlaying) {
              playBlockNarration(b);
            } else {
              handleSelectBlock(b);
            }
          }}
          isOpen={sidebarOpen}
          onToggleOpen={() => setSidebarOpen(!sidebarOpen)}
        />

        <PDFViewer
          currentPage={currentPage}
          numPages={numPages}
          currentPageLayout={currentPageLayout}
          activeBlock={activeBlock}
          activeHighlight={activeHighlight}
          inspectorMode={inspectorMode}
          scale={scale}
          readCodeLiterally={studySettings.readCodeLiterally}
          onScaleChange={setScale}
          onPageChange={handlePageChange}
          onSelectBlock={(b) => {
            if (isPlaying) {
              playBlockNarration(b);
            } else {
              handleSelectBlock(b);
            }
          }}
          onToggleCodeLiterally={handleToggleCodeLiterally}
        />
      </div>

      {/* Bottom Playback & Progress Bar */}
      <PlaybackBar
        isPlaying={isPlaying}
        speed={speed}
        volume={volume}
        selectedVoice={selectedVoice}
        availableVoices={availableVoices}
        activeBlock={activeBlock}
        totalBlocks={readableBlocks.length}
        currentBlockIndex={currentBlockIndex}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onPrevBlock={handlePrevBlock}
        onNextBlock={handleNextBlock}
        onPrevPage={() => handlePageChange(currentPage - 1)}
        onNextPage={() => handlePageChange(currentPage + 1)}
        onSpeedChange={handleSpeedChange}
        onVoiceChange={setSelectedVoice}
        onVolumeChange={handleVolumeChange}
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
