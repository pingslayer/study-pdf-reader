import React from 'react';
import { X, Sliders, CheckSquare, Square, Info } from 'lucide-react';
import { StudySettings } from '../../types/pdf';

interface StudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StudySettings;
  onUpdateSettings: (newSettings: StudySettings) => void;
}

export const StudySettingsModal: React.FC<StudySettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const toggleSetting = (key: keyof StudySettings) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const settingItems: Array<{
    key: keyof StudySettings;
    title: string;
    description: string;
    recommended: boolean;
  }> = [
    {
      key: 'skipHeadersFooters',
      title: 'Skip headers & running footers',
      description: 'Do not read repetitive book titles, running chapter headers, or page footers.',
      recommended: true,
    },
    {
      key: 'skipPageNumbers',
      title: 'Skip page numbers',
      description: 'Prevents standalone page numbers from interrupting technical prose.',
      recommended: true,
    },
    {
      key: 'readCaptions',
      title: 'Read figure & diagram captions',
      description: 'Narrates the descriptive caption beneath figures and tables without pausing.',
      recommended: true,
    },
    {
      key: 'readCodeLiterally',
      title: 'Read code syntax literally',
      description: 'Speaks programming syntax character-by-character with visual token highlights.',
      recommended: true,
    },
    {
      key: 'skipCodeBlocks',
      title: 'Auto-skip code listings',
      description: 'Automatically jumps over source code listings to keep reading prose.',
      recommended: false,
    },
    {
      key: 'skipDiagrams',
      title: 'Auto-skip diagram text labels',
      description: 'Skips floating diagram labels and arrows. (Non-textual images are always skipped).',
      recommended: false,
    },
    {
      key: 'readEquations',
      title: 'Read mathematical equations',
      description: 'Off by default to avoid raw math symbols sounding awkward before translation.',
      recommended: false,
    },
    {
      key: 'pauseAtFigure',
      title: 'Pause at figures (manual inspect)',
      description: 'Halts narration when reaching diagrams to let you inspect visual figures manually.',
      recommended: false,
    },
    {
      key: 'pauseAtCode',
      title: 'Pause at code examples (manual review)',
      description: 'Pauses playback after code snippets so you can review code syntax at your own pace.',
      recommended: false,
    },
    {
      key: 'pauseAtHeading',
      title: 'Pause at section headings',
      description: 'Briefly pause narration at new chapter or section boundaries.',
      recommended: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-zinc-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Study Controls & Behavior</h2>
              <p className="text-[11px] text-zinc-400">Tailor narration and filtering to your learning style</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Intro Banner */}
        <div className="px-5 py-2.5 bg-zinc-950/70 border-b border-zinc-800 flex items-start space-x-2.5 text-xs text-zinc-400">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            StudyPDF Reader prioritizes technical comprehension over generic audiobook narration. Toggle how code blocks, equations, diagrams, and running headers are handled.
          </p>
        </div>

        {/* Setting toggles list */}
        <div className="p-4 overflow-y-auto space-y-2.5 custom-scrollbar">
          {settingItems.map((item) => {
            const isEnabled = settings[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleSetting(item.key)}
                className={`flex items-start justify-between p-3 rounded-lg border transition cursor-pointer select-none ${
                  isEnabled
                    ? 'bg-zinc-950/80 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-800/40 hover:border-zinc-700/80'
                }`}
              >
                <div className="pr-3">
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs font-medium ${isEnabled ? 'text-zinc-100' : 'text-zinc-300'}`}>
                      {item.title}
                    </span>
                    {item.recommended && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="shrink-0 mt-0.5">
                  {isEnabled ? (
                    <div className="w-5 h-5 rounded bg-amber-500 text-zinc-950 flex items-center justify-center shadow-sm">
                      <CheckSquare className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border border-zinc-700 bg-zinc-800/60 flex items-center justify-center hover:border-zinc-600 transition">
                      <Square className="w-3.5 h-3.5 text-transparent" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">Changes apply immediately</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-zinc-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
