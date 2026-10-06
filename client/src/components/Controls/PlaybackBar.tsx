import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Mic, 
  FastForward,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { PDFBlock } from '../../types/pdf';

interface Voice {
  id: string;
  name: string;
}

interface PlaybackBarProps {
  isPlaying: boolean;
  isBuffering?: boolean;
  speed: number;
  volume: number;
  selectedVoice: string;
  availableVoices: Voice[];
  activeBlock: PDFBlock | null;
  totalBlocks: number;
  currentBlockIndex: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrevBlock: () => void;
  onNextBlock: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSpeedChange: (speed: number) => void;
  onVoiceChange: (voiceId: string) => void;
  onVolumeChange: (volume: number) => void;
}

const playbackSpeeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
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
  onPrevPage,
  onNextPage,
  onSpeedChange,
  onVoiceChange,
  onVolumeChange,
}) => {
  return (
    <div className="h-16 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6 z-20 shadow-lg select-none">
      {/* Left: Document & Block Navigation */}
      <div className="flex items-center space-x-2 w-1/4">
        <button
          onClick={onPrevPage}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={onPrevBlock}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Previous Block"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={isPlaying || isBuffering ? onPause : onPlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition ${
            isBuffering
              ? 'bg-slate-800 text-sky-400 border border-sky-500/50 shadow-sky-500/20 animate-pulse hover:bg-slate-700'
              : 'bg-sky-600 hover:bg-sky-500 active:scale-95 text-white shadow-sky-600/30'
          }`}
          title={isBuffering ? 'Buffering Audio (Click to Cancel)...' : isPlaying ? 'Pause Narration (Space)' : 'Play Narration (Space)'}
        >
          {isBuffering ? (
            <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={onStop}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
          title="Stop Playback"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>

        <button
          onClick={onNextBlock}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition"
          title="Next Block"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={onNextPage}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Center: Reading Status & Progress */}
      <div className="flex-1 max-w-md flex flex-col items-center justify-center px-4">
        <div className="flex items-center space-x-2 text-xs mb-1">
          {isBuffering ? (
            <span className="text-sky-400 font-semibold animate-pulse flex items-center">
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              BUFFERING AUDIO...
            </span>
          ) : activeBlock ? (
            <>
              <span className="font-semibold text-sky-400 uppercase tracking-wide">
                [{activeBlock.type}]
              </span>
              <span className="text-slate-300 truncate max-w-xs" title={activeBlock.text}>
                {activeBlock.text.slice(0, 55)}...
              </span>
            </>
          ) : (
            <span className="text-slate-500 italic">Select a block or click Play to begin</span>
          )}
        </div>

        {/* Progress Track */}
        <div className="w-full flex items-center space-x-2">
          <span className="text-[10px] font-mono text-slate-500 w-12 text-right">
            {currentBlockIndex >= 0 ? `${currentBlockIndex + 1} / ${totalBlocks}` : '0 / 0'}
          </span>
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-300"
              style={{
                width: `${totalBlocks > 0 && currentBlockIndex >= 0 ? ((currentBlockIndex + 1) / totalBlocks) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: Speed, Voice, Volume */}
      <div className="flex items-center space-x-4 w-1/4 justify-end">
        {/* Speed Selector */}
        <div className="flex items-center space-x-1">
          <FastForward className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-1.5 py-1 focus:outline-none focus:border-sky-500"
            title="Playback Speed"
          >
            {playbackSpeeds.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        {/* Voice Selector */}
        <div className="flex items-center space-x-1">
          <Mic className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedVoice}
            onChange={(e) => onVoiceChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 max-w-[130px] truncate focus:outline-none focus:border-sky-500"
            title="Narration Voice"
          >
            {availableVoices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
