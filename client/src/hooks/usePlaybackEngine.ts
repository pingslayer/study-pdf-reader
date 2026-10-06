import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFBlock, StudySettings, BoundingBox } from '../types/pdf';
import { ttsPlayer, TTSClientResponse } from '../services/ttsClient';
import {
  buildVisualTokensFromBlock,
  buildVisualTokensFromAlignment,
  findMatchingVisualToken,
  VisualToken,
} from '../services/textMapping';

export type PlaybackStatus = 'idle' | 'buffering' | 'playing' | 'paused' | 'error';

export function getSpokenTextForBlock(
  block: PDFBlock,
  settings: StudySettings,
  visualTokens?: VisualToken[]
): string {
  if (block.type === 'code') {
    if (settings.readCodeLiterally) {
      return block.text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    } else {
      return 'Code example. ' + (block.languageHint ? `${block.languageHint} code.` : '');
    }
  }
  if (visualTokens && visualTokens.length > 0) {
    return visualTokens.map((vt) => vt.word).join(' ');
  }
  return block.text.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export interface UsePlaybackEngineProps {
  readableBlocks: PDFBlock[];
  selectedVoice: string;
  speed: number;
  volume: number;
  studySettings: StudySettings;
  currentPage: number;
  numPages: number;
  onPageChange: (page: number) => void;
}

export function usePlaybackEngine({
  readableBlocks,
  selectedVoice,
  speed,
  volume,
  studySettings,
  currentPage,
  numPages,
  onPageChange,
}: UsePlaybackEngineProps) {
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [activeBlock, setActiveBlock] = useState<PDFBlock | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<BoundingBox | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Status & active block references for async callbacks and closures
  const statusRef = useRef<PlaybackStatus>('idle');
  statusRef.current = status;

  const activeBlockRef = useRef<PDFBlock | null>(null);
  activeBlockRef.current = activeBlock;

  const readableBlocksRef = useRef<PDFBlock[]>(readableBlocks);
  readableBlocksRef.current = readableBlocks;

  // Monotonic generation ticket to discard stale async responses from previous blocks
  const playbackEpochRef = useRef<number>(0);

  // Visual tokens and alignment state
  const visualTokensRef = useRef<VisualToken[]>([]);
  const lastMatchedTokenIndexRef = useRef<number>(0);
  const isAtBlockEndRef = useRef<boolean>(false);

  // Background prefetch cache: maps "blockId:voiceId" to in-flight or resolved TTS Promise
  const prefetchCacheRef = useRef<Map<string, Promise<TTSClientResponse>>>(new Map());

  // Function ref handles to allow recursive advancement without circular closure dependencies
  const handleNextBlockRef = useRef<() => void>(() => {});
  const playBlockNarrationRef = useRef<(block: PDFBlock) => void>(() => {});

  // Flag to auto-continue playback when navigating to the next page naturally
  const autoPlayOnPageLoadRef = useRef<boolean>(false);

  // Auto-play next page when readableBlocks load if autoPlayOnPageLoadRef was set
  useEffect(() => {
    if (autoPlayOnPageLoadRef.current && readableBlocks.length > 0) {
      autoPlayOnPageLoadRef.current = false;
      playBlockNarrationRef.current(readableBlocks[0]);
    }
  }, [readableBlocks]);

  // Prefetch initial block when page changes or voice changes
  useEffect(() => {
    if (readableBlocks.length > 0 && statusRef.current === 'idle') {
      const firstBlock = readableBlocks[0];
      const firstKey = `${firstBlock.id}:${selectedVoice}`;
      if (!prefetchCacheRef.current.has(firstKey)) {
        const tokens = buildVisualTokensFromBlock(firstBlock);
        const text = getSpokenTextForBlock(firstBlock, studySettings, tokens);
        if (text && text.trim().length > 0) {
          const p = ttsPlayer.fetchTTS(text, selectedVoice);
          p.catch((err) => {
            console.warn('Initial prefetch failed:', err);
            prefetchCacheRef.current.delete(firstKey);
          });
          prefetchCacheRef.current.set(firstKey, p);
        }
      }
    }
  }, [readableBlocks, selectedVoice, studySettings]);

  // Main playback trigger for a specific block
  const playBlockNarration = useCallback(
    async (block: PDFBlock) => {
      // 1. Issue new Playback Generation Epoch Ticket to cancel all previous async requests
      const epoch = ++playbackEpochRef.current;
      setNetworkError(null);

      // Stop any existing audio immediately
      ttsPlayer.stop();

      isAtBlockEndRef.current = false;
      setActiveBlock(block);
      visualTokensRef.current = buildVisualTokensFromBlock(block);
      lastMatchedTokenIndexRef.current = 0;
      setActiveHighlight(block.bbox);
      setStatus('buffering');

      const spokenText = getSpokenTextForBlock(block, studySettings, visualTokensRef.current);

      const blockWords = block.text.trim().split(/\s+/).filter(Boolean).length;
      const isShortBlock = blockWords < 12 || block.text.trim().length < 75;

      // Word-Quota Adaptive Window: look ahead up to 3 blocks or 35 words
      const TARGET_WORD_QUOTA = 35;
      const MAX_PREFETCH_BLOCKS = 3;
      const readable = readableBlocksRef.current;
      const currIdx = readable.findIndex((b) => b.id === block.id);
      const upcomingBlocks: PDFBlock[] = [];

      if (currIdx >= 0) {
        let accumulatedWords = 0;
        for (let i = currIdx + 1; i < readable.length && upcomingBlocks.length < MAX_PREFETCH_BLOCKS; i++) {
          const candidate = readable[i];
          upcomingBlocks.push(candidate);
          const wCount = candidate.text.trim().split(/\s+/).filter(Boolean).length;
          accumulatedWords += wCount;
          if (accumulatedWords >= TARGET_WORD_QUOTA) break;
        }
      }

      // Early Parallel Prefetch for short blocks (e.g. 5-word heading)
      if (isShortBlock && upcomingBlocks.length > 0) {
        const firstUpcoming = upcomingBlocks[0];
        const nextKey = `${firstUpcoming.id}:${selectedVoice}`;
        if (!prefetchCacheRef.current.has(nextKey)) {
          const nextTokens = buildVisualTokensFromBlock(firstUpcoming);
          const nextSpokenText = getSpokenTextForBlock(firstUpcoming, studySettings, nextTokens);
          if (nextSpokenText && nextSpokenText.trim().length > 0) {
            const nextPromise = ttsPlayer.fetchTTS(nextSpokenText, selectedVoice);
            nextPromise.catch((err) => {
              console.warn('Early prefetch failed for block:', firstUpcoming.id, err);
              prefetchCacheRef.current.delete(nextKey);
            });
            prefetchCacheRef.current.set(nextKey, nextPromise);
          }
        }
      }

      try {
        const cacheKey = `${block.id}:${selectedVoice}`;
        let ttsPromise = prefetchCacheRef.current.get(cacheKey);
        if (!ttsPromise) {
          ttsPromise = ttsPlayer.fetchTTS(spokenText, selectedVoice);
        }
        prefetchCacheRef.current.delete(cacheKey);

        const ttsData = await ttsPromise;

        // STALE TICKET CHECK: if user changed block, stopped, or paused while buffering, discard
        if (epoch !== playbackEpochRef.current || statusRef.current === 'idle') {
          return;
        }

        // Ground-Truth Synchronization: map TTS alignment words to visual tokens
        if (ttsData.alignment && ttsData.alignment.length > 0) {
          visualTokensRef.current = buildVisualTokensFromAlignment(block, ttsData.alignment);
          lastMatchedTokenIndexRef.current = 0;
        }

        // Fill remaining upcoming blocks in background cache
        if (upcomingBlocks.length > 0) {
          (async () => {
            for (const b of upcomingBlocks) {
              if (epoch !== playbackEpochRef.current || statusRef.current === 'idle') break;
              const nextKey = `${b.id}:${selectedVoice}`;
              if (prefetchCacheRef.current.has(nextKey)) continue;

              const nextTokens = buildVisualTokensFromBlock(b);
              const nextSpokenText = getSpokenTextForBlock(b, studySettings, nextTokens);
              if (!nextSpokenText || nextSpokenText.trim().length === 0) continue;

              try {
                const nextPromise = ttsPlayer.fetchTTS(nextSpokenText, selectedVoice);
                prefetchCacheRef.current.set(nextKey, nextPromise);

                if (prefetchCacheRef.current.size > 15) {
                  const firstKey = prefetchCacheRef.current.keys().next().value;
                  if (firstKey) prefetchCacheRef.current.delete(firstKey);
                }

                await nextPromise;
              } catch (err) {
                console.warn('Background prefetch failed for block:', b.id, err);
                prefetchCacheRef.current.delete(nextKey);
              }
            }
          })();
        }

        setStatus('playing');

        ttsPlayer.playWithAlignment(
          ttsData,
          spokenText,
          speed,
          volume,
          (word: string, wordIndex: number, charIndex?: number) => {
            if (epoch !== playbackEpochRef.current) return;
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
            // Natural completion of current block
            if (epoch !== playbackEpochRef.current || statusRef.current === 'idle') return;
            isAtBlockEndRef.current = true;

            const readableList = readableBlocksRef.current;
            const cIdx = readableList.findIndex((b) => b.id === block.id);
            const nBlock = cIdx >= 0 ? readableList[cIdx + 1] : undefined;

            if (studySettings.pauseAtCode && block.type === 'code' && nBlock?.type !== 'code') {
              setStatus('paused');
              return;
            }
            if (studySettings.pauseAtFigure && (block.type === 'caption' || block.type === 'figure')) {
              setStatus('paused');
              return;
            }
            if (studySettings.pauseAtHeading && block.type === 'heading') {
              setStatus('paused');
              return;
            }

            // Advance to next block
            handleNextBlockRef.current();
          },
          (_playErr) => {
            if (epoch !== playbackEpochRef.current) return;
            setStatus('error');
            setNetworkError('Audio playback failed. Please check your internet connection.');
          }
        );
      } catch (err: any) {
        if (epoch !== playbackEpochRef.current) return;

        setStatus('error');
        ttsPlayer.stop();

        const errMsg = err?.message || 'Cannot reach speech service. Please check your internet connection.';
        console.warn('TTS playback error (circuit breaker tripped):', errMsg);
        setNetworkError(errMsg);
      }
    },
    [selectedVoice, speed, volume, studySettings]
  );

  // Play button clicked
  const play = useCallback(() => {
    setNetworkError(null);
    // If paused mid-sentence on active block, resume immediately from the exact word
    if (activeBlockRef.current && ttsPlayer.canResume()) {
      setStatus('playing');
      ttsPlayer.resume();
      return;
    }

    const readable = readableBlocksRef.current;
    if (readable.length === 0) return;

    // If playback paused at end of a block (e.g. pauseAtHeading/Code/Figure), advance to next
    if (activeBlockRef.current && isAtBlockEndRef.current) {
      handleNextBlockRef.current();
      return;
    }

    if (activeBlockRef.current) {
      playBlockNarration(activeBlockRef.current);
    } else {
      playBlockNarration(readable[0]);
    }
  }, [playBlockNarration]);

  // Pause: freezes playback and preserves the session epoch ticket
  const pause = useCallback(() => {
    setStatus('paused');
    ttsPlayer.pause();
  }, []);

  // Stop: invalidates session epoch, unloads audio, and clears highlights
  const stop = useCallback(() => {
    playbackEpochRef.current++;
    setStatus('idle');
    isAtBlockEndRef.current = false;
    prefetchCacheRef.current.clear();
    ttsPlayer.stop();
    setActiveHighlight(null);
    setNetworkError(null);
  }, []);

  // Advance to next block
  const nextBlock = useCallback(() => {
    const readable = readableBlocksRef.current;
    if (readable.length === 0) return;

    const current = activeBlockRef.current;
    if (!current) {
      if (statusRef.current === 'playing' || statusRef.current === 'buffering') {
        playBlockNarrationRef.current(readable[0]);
      } else {
        ttsPlayer.stop();
        setActiveBlock(readable[0]);
        visualTokensRef.current = buildVisualTokensFromBlock(readable[0]);
        lastMatchedTokenIndexRef.current = 0;
        setActiveHighlight(readable[0].bbox);
      }
      return;
    }

    const currentIndex = readable.findIndex((b) => b.id === current.id);
    if (currentIndex >= 0 && currentIndex + 1 < readable.length) {
      const next = readable[currentIndex + 1];
      if (statusRef.current === 'playing' || statusRef.current === 'buffering') {
        playBlockNarrationRef.current(next);
      } else {
        ttsPlayer.stop();
        setActiveBlock(next);
        visualTokensRef.current = buildVisualTokensFromBlock(next);
        lastMatchedTokenIndexRef.current = 0;
        setActiveHighlight(next.bbox);
      }
    } else if (currentPage < numPages) {
      if (statusRef.current === 'playing' || statusRef.current === 'buffering') {
        autoPlayOnPageLoadRef.current = true;
      }
      onPageChange(currentPage + 1);
    } else {
      stop();
    }
  }, [currentPage, numPages, onPageChange, stop]);

  // Back to previous block
  const prevBlock = useCallback(() => {
    const readable = readableBlocksRef.current;
    if (readable.length === 0) return;

    const current = activeBlockRef.current;
    if (!current) {
      ttsPlayer.stop();
      setActiveBlock(readable[0]);
      visualTokensRef.current = buildVisualTokensFromBlock(readable[0]);
      lastMatchedTokenIndexRef.current = 0;
      setActiveHighlight(readable[0].bbox);
      return;
    }

    const currentIndex = readable.findIndex((b) => b.id === current.id);
    if (currentIndex > 0) {
      const prev = readable[currentIndex - 1];
      if (statusRef.current === 'playing' || statusRef.current === 'buffering') {
        playBlockNarrationRef.current(prev);
      } else {
        ttsPlayer.stop();
        setActiveBlock(prev);
        visualTokensRef.current = buildVisualTokensFromBlock(prev);
        lastMatchedTokenIndexRef.current = 0;
        setActiveHighlight(prev.bbox);
      }
    }
  }, []);

  // Explicit user selection of a block (clicking on PDF or in Outline)
  const selectBlock = useCallback(
    (block: PDFBlock) => {
      if (statusRef.current === 'playing' || statusRef.current === 'buffering') {
        playBlockNarration(block);
      } else {
        ttsPlayer.stop();
        isAtBlockEndRef.current = false;
        setActiveBlock(block);
        visualTokensRef.current = buildVisualTokensFromBlock(block);
        lastMatchedTokenIndexRef.current = 0;
        setActiveHighlight(block.bbox);
      }
    },
    [playBlockNarration]
  );

  // Reset playback when loading a document or changing pages
  const resetPlayback = useCallback(() => {
    playbackEpochRef.current++;
    autoPlayOnPageLoadRef.current = false;
    ttsPlayer.stop();
    setStatus('idle');
    setActiveBlock(null);
    setActiveHighlight(null);
    setNetworkError(null);
    prefetchCacheRef.current.clear();
  }, []);

  // Clear cache on voice change
  const clearPrefetchCache = useCallback(() => {
    prefetchCacheRef.current.clear();
  }, []);

  // Keep refs updated for circular callbacks
  playBlockNarrationRef.current = playBlockNarration;
  handleNextBlockRef.current = nextBlock;

  return {
    status,
    isPlaying: status === 'playing',
    isBuffering: status === 'buffering',
    activeBlock,
    activeHighlight,
    networkError,
    play,
    pause,
    stop,
    nextBlock,
    prevBlock,
    selectBlock,
    clearError: () => setNetworkError(null),
    resetPlayback,
    clearPrefetchCache,
    playBlockNarration,
  };
}
