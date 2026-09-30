import React, { useState } from 'react';
import { Layers, ListOrdered, ChevronLeft, ChevronRight, Hash, Code, Image, Calculator, FileText } from 'lucide-react';
import { PageLayoutData, PDFBlock, BlockType } from '../types/pdf';
import { Badge } from './Common/Badge';

interface SidebarProps {
  numPages: number;
  currentPage: number;
  currentPageLayout: PageLayoutData | null;
  activeBlockId: string | null;
  onSelectPage: (page: number) => void;
  onSelectBlock: (block: PDFBlock) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  numPages,
  currentPage,
  currentPageLayout,
  activeBlockId,
  onSelectPage,
  onSelectBlock,
  isOpen,
  onToggleOpen,
}) => {
  const [activeTab, setActiveTab] = useState<'pages' | 'blocks'>('blocks');

  if (!isOpen) {
    return (
      <div className="w-10 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-3 z-10">
        <button
          onClick={onToggleOpen}
          className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Expand Navigation Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const getBlockIcon = (type: BlockType) => {
    switch (type) {
      case 'code':
        return <Code className="w-3.5 h-3.5 text-emerald-400" />;
      case 'caption':
      case 'figure':
        return <Image className="w-3.5 h-3.5 text-amber-400" />;
      case 'equation':
        return <Calculator className="w-3.5 h-3.5 text-rose-400" />;
      case 'heading':
        return <Hash className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const blocks = currentPageLayout?.blocks || [];

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col z-10 select-none">
      {/* Sidebar Header & Tab Switcher */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('blocks')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'blocks'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Blocks</span>
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-md font-medium transition ${
              activeTab === 'pages'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pages</span>
          </button>
        </div>

        <button
          onClick={onToggleOpen}
          className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'blocks' ? (
          <div>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
              <span>Page {currentPage} Reading Flow</span>
              <span className="text-slate-500 font-normal">{blocks.length} blocks</span>
            </div>

            {blocks.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                Extracting page layout...
              </div>
            ) : (
              <div className="space-y-1.5">
                {blocks.map((block) => {
                  const isActive = activeBlockId === block.id;
                  const isFiltered = block.isFiltered;

                  return (
                    <div
                      key={block.id}
                      onClick={() => onSelectBlock(block)}
                      className={`group relative p-2.5 rounded-lg border text-left cursor-pointer transition ${
                        isActive
                          ? 'bg-sky-950/80 border-sky-500 shadow-md ring-1 ring-sky-500/50'
                          : isFiltered
                          ? 'bg-slate-900/40 border-slate-800/60 opacity-50 hover:opacity-80'
                          : 'bg-slate-900/80 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-1.5">
                          {getBlockIcon(block.type)}
                          <Badge type={block.type} />
                        </div>
                        {block.readingOrderIndex >= 0 && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1 rounded">
                            #{block.readingOrderIndex + 1}
                          </span>
                        )}
                        {isFiltered && (
                          <span className="text-[9px] text-amber-500/80 uppercase font-mono">
                            Skipped
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 font-sans line-clamp-2 leading-relaxed">
                        {block.text || '(empty block)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Document Pages ({numPages})
            </div>
            <div className="grid grid-cols-2 gap-2 p-1">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
                const isSelected = p === currentPage;
                return (
                  <button
                    key={p}
                    onClick={() => onSelectPage(p)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition ${
                      isSelected
                        ? 'bg-sky-950 border-sky-500 text-sky-200 ring-1 ring-sky-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-5 h-5 mb-1.5 opacity-70" />
                    <span>Page {p}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
