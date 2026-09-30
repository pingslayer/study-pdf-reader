import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RotateCcw,
  Code2
} from 'lucide-react';

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (newPage: number) => void;
  onScaleChange: (newScale: number) => void;
  onFitWidth: () => void;
  onFitPage: () => void;
  isCodeActive?: boolean;
  readCodeLiterally: boolean;
  onToggleCodeLiterally: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onScaleChange,
  onFitWidth,
  onFitPage,
  isCodeActive = false,
  readCodeLiterally,
  onToggleCodeLiterally,
}) => {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= numPages) {
      onPageChange(val);
    }
  };

  return (
    <div className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-10 select-none shadow-sm">
      {/* Page Navigation */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition"
          title="Previous Page (Left Arrow)"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-1 text-xs text-slate-300">
          <span className="text-slate-400">Page</span>
          <input
            type="number"
            min={1}
            max={numPages || 1}
            value={currentPage}
            onChange={handlePageInputChange}
            className="w-11 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center text-xs text-white focus:outline-none focus:border-sky-500"
          />
          <span className="text-slate-500">/ {numPages || 1}</span>
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition"
          title="Next Page (Right Arrow)"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Code Mode Action (shown when code block is active) */}
      {isCodeActive && (
        <div className="flex items-center space-x-2 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-md text-xs animate-fade-in">
          <Code2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300 font-medium">Code block active</span>
          <button
            onClick={onToggleCodeLiterally}
            className={`px-2 py-0.5 text-[11px] rounded transition ${
              readCodeLiterally
                ? 'bg-emerald-600 text-white font-medium'
                : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800'
            }`}
          >
            {readCodeLiterally ? 'Literal Code Reading: ON' : 'Read code literally'}
          </button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => onScaleChange(Math.max(0.5, scale - 0.15))}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-slate-300 w-12 text-center">
          {Math.round(scale * 100)}%
        </span>

        <button
          onClick={() => onScaleChange(Math.min(3.0, scale + 0.15))}
          className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <button
          onClick={onFitWidth}
          className="px-2 py-1 text-xs rounded hover:bg-slate-800 text-slate-300 transition"
          title="Fit to Width"
        >
          Fit Width
        </button>

        <button
          onClick={onFitPage}
          className="px-2 py-1 text-xs rounded hover:bg-slate-800 text-slate-300 transition"
          title="Fit Page"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onScaleChange(1.0)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Reset Zoom to 100%"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
