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
      key: 'skipCodeBlocks',
      title: 'Skip code listings & syntax',
      description: 'Bypasses C, Python, and shell program listings so audio narration maintains continuous conceptual flow (like Coursera).',
      recommended: true,
    },
    {
      key: 'skipDiagrams',
      title: 'Skip diagram labels & illustrations',
      description: 'Ignores floating flowchart text, arrows, and vector diagram labels.',
      recommended: true,
    },
    {
      key: 'skipHeadersFooters',
      title: 'Skip headers & running footers',
      description: 'Do not read repetitive book titles, chapter headers, or page footers.',
      recommended: true,
    },
    {
      key: 'skipPageNumbers',
      title: 'Skip page numbers',
      description: 'Prevents random standalone page numbers from interrupting technical prose.',
      recommended: true,
    },
    {
      key: 'readCaptions',
      title: 'Read figure & diagram captions',
      description: 'Narrates the descriptive caption beneath figures and tables without pausing.',
      recommended: true,
    },
    {
      key: 'pauseAtFigure',
      title: 'Pause at figures (manual inspect)',
      description: 'Halts narration when reaching diagrams if you wish to inspect visual figures manually.',
      recommended: false,
    },
    {
      key: 'pauseAtCode',
      title: 'Pause at code examples (manual review)',
      description: 'Stops before or after code snippets to review code syntax manually.',
      recommended: false,
    },
    {
      key: 'pauseAtHeading',
      title: 'Pause at section headings',
      description: 'Briefly pause narration at new chapter or section boundaries.',
      recommended: false,
    },
    {
      key: 'readEquations',
      title: 'Read mathematical equations',
      description: 'Off by default to avoid raw math symbols sounding awkward before Math-to-Speech translation.',
      recommended: false,
    },
    {
      key: 'readCodeLiterally',
      title: 'Read code syntax literally',
      description: 'Speaks programming syntax ("open brace, semicolon") if code skipping is disabled.',
      recommended: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Study Controls & Behavior</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Intro */}
        <div className="px-5 py-3 bg-sky-950/30 border-b border-sky-900/40 flex items-start space-x-2 text-xs text-sky-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p>
            StudyPDF Reader favors technical learning over audiobook listening. Configure how code blocks, equations, diagrams, and running headers are handled.
          </p>
        </div>

        {/* Setting toggles list */}
        <div className="p-5 overflow-y-auto space-y-4">
          {settingItems.map((item) => {
            const isEnabled = settings[item.key];
            return (
              <div
                key={item.key}
                onClick={() => toggleSetting(item.key)}
                className="flex items-start justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/50 hover:bg-slate-800/40 cursor-pointer transition select-none"
              >
                <div className="pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-200">{item.title}</span>
                    {item.recommended && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>

                <div className="shrink-0 mt-1">
                  {isEnabled ? (
                    <div className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center shadow">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border border-slate-600 bg-slate-800 flex items-center justify-center">
                      <Square className="w-4 h-4 text-transparent" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
