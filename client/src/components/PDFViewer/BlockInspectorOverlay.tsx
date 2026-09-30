import React from 'react';
import { PDFBlock, BlockType } from '../../types/pdf';

interface BlockInspectorOverlayProps {
  blocks: PDFBlock[];
  scale: number;
  width: number;
  height: number;
  activeBlockId: string | null;
  onSelectBlock: (block: PDFBlock) => void;
  visible: boolean;
}

const blockColorMap: Record<BlockType, { border: string; bg: string; text: string; badge: string }> = {
  heading: {
    border: 'border-purple-500/80',
    bg: 'hover:bg-purple-500/10',
    text: 'text-purple-300',
    badge: 'bg-purple-900/90 text-purple-200 border-purple-600',
  },
  paragraph: {
    border: 'border-blue-500/80',
    bg: 'hover:bg-blue-500/10',
    text: 'text-blue-300',
    badge: 'bg-blue-900/90 text-blue-200 border-blue-600',
  },
  code: {
    border: 'border-emerald-500/80',
    bg: 'hover:bg-emerald-500/10',
    text: 'text-emerald-300',
    badge: 'bg-emerald-900/90 text-emerald-200 border-emerald-600',
  },
  caption: {
    border: 'border-amber-500/80',
    bg: 'hover:bg-amber-500/10',
    text: 'text-amber-300',
    badge: 'bg-amber-900/90 text-amber-200 border-amber-600',
  },
  figure: {
    border: 'border-cyan-500/80',
    bg: 'hover:bg-cyan-500/10',
    text: 'text-cyan-300',
    badge: 'bg-cyan-900/90 text-cyan-200 border-cyan-600',
  },
  equation: {
    border: 'border-rose-500/80',
    bg: 'hover:bg-rose-500/10',
    text: 'text-rose-300',
    badge: 'bg-rose-900/90 text-rose-200 border-rose-600',
  },
  header: {
    border: 'border-slate-500/60 border-dashed',
    bg: 'hover:bg-slate-500/10',
    text: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-600',
  },
  footer: {
    border: 'border-slate-500/60 border-dashed',
    bg: 'hover:bg-slate-500/10',
    text: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-600',
  },
  list: {
    border: 'border-indigo-500/80',
    bg: 'hover:bg-indigo-500/10',
    text: 'text-indigo-300',
    badge: 'bg-indigo-900/90 text-indigo-200 border-indigo-600',
  },
};

export const BlockInspectorOverlay: React.FC<BlockInspectorOverlayProps> = ({
  blocks,
  scale,
  width,
  height,
  activeBlockId,
  onSelectBlock,
  visible,
}) => {
  if (!visible) {
    // In normal mode, make blocks transparently clickable so the user can click any paragraph on the PDF to read it!
    return (
      <div
        className="absolute top-0 left-0 z-10 pointer-events-auto"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            onClick={() => onSelectBlock(block)}
            className="absolute cursor-pointer hover:bg-sky-500/10 transition-colors rounded"
            title={`Click to read: [${block.type.toUpperCase()}] ${block.text.slice(0, 40)}...`}
            style={{
              left: `${(block.bbox.x - 2) * scale}px`,
              top: `${(block.bbox.y - 2) * scale}px`,
              width: `${(block.bbox.width + 4) * scale}px`,
              height: `${(block.bbox.height + 4) * scale}px`,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className="absolute top-0 left-0 z-10 pointer-events-auto select-none"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {blocks.map((block) => {
        const styling = blockColorMap[block.type] || blockColorMap.paragraph;
        const isActive = activeBlockId === block.id;

        return (
          <div
            key={block.id}
            onClick={() => onSelectBlock(block)}
            className={`absolute border-2 rounded transition-all cursor-pointer group ${styling.border} ${styling.bg} ${
              isActive ? 'ring-2 ring-sky-400 bg-sky-500/20' : ''
            }`}
            style={{
              left: `${(block.bbox.x - 2) * scale}px`,
              top: `${(block.bbox.y - 2) * scale}px`,
              width: `${(block.bbox.width + 4) * scale}px`,
              height: `${(block.bbox.height + 4) * scale}px`,
            }}
          >
            {/* Type & Order Badge */}
            <div
              className={`absolute -top-3.5 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shadow-sm flex items-center space-x-1 ${styling.badge}`}
            >
              <span>{block.type}</span>
              {block.readingOrderIndex >= 0 && (
                <span className="opacity-80">#{block.readingOrderIndex + 1}</span>
              )}
              {block.isFiltered && <span className="text-amber-400">(skip)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};
