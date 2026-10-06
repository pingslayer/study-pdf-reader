import React, { useEffect, useRef, useState } from 'react';
import { HighlightLayer } from './HighlightLayer';
import { BlockInspectorOverlay } from './BlockInspectorOverlay';
import { PageLayoutData, PDFBlock, BoundingBox } from '../../types/pdf';
import { pdfService } from '../../services/pdfService';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  fileName: string;
  currentPage: number;
  numPages: number;
  currentPageLayout: PageLayoutData | null;
  activeBlock: PDFBlock | null;
  activeHighlight: BoundingBox | null;
  inspectorMode: boolean;
  scale: number;
  onSelectBlock: (block: PDFBlock) => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  fileName,
  currentPage,
  numPages,
  currentPageLayout,
  activeBlock,
  activeHighlight,
  inspectorMode,
  scale,
  onSelectBlock,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [isRendering, setIsRendering] = useState(false);

  // Render PDF page to canvas
  useEffect(() => {
    let isCancelled = false;

    const render = async () => {
      if (!canvasRef.current || currentPage <= 0 || currentPage > numPages) return;

      try {
        setIsRendering(true);
        const dims = await pdfService.renderPageToCanvas(currentPage, canvasRef.current, scale);
        if (!isCancelled) {
          setRenderedDimensions(dims);
        }

        // Font readiness check: if embedded fonts were being processed by the browser
        // during canvas drawing, wait for document.fonts.ready and refresh canvas so
        // glyphs and character maps never appear inverted or garbled.
        if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
          if (document.fonts.status === 'loading') {
            await document.fonts.ready;
            if (!isCancelled && canvasRef.current) {
              const refreshedDims = await pdfService.renderPageToCanvas(currentPage, canvasRef.current, scale);
              if (!isCancelled) {
                setRenderedDimensions(refreshedDims);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to render PDF page:', err);
      } finally {
        if (!isCancelled) {
          setIsRendering(false);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, scale, numPages, fileName]);

  return (
    <div className="flex-1 h-full bg-zinc-950 overflow-hidden relative">
      {/* 100% Full-Height Unobstructed PDF Scroll Viewport */}
      <div
        ref={scrollContainerRef}
        className="h-full w-full overflow-auto py-8 px-6 flex justify-center items-start relative select-none"
      >
        <div className="relative shadow-2xl rounded-sm border border-zinc-800/80 bg-white">
          {/* Fresh canvas element per document and page to prevent dirty context matrix reuse */}
          <canvas
            key={`canvas-${fileName}-${currentPage}`}
            ref={canvasRef}
            className="block shadow-xl rounded-sm"
          />

          {/* Synchronized Highlighting Layer */}
          <HighlightLayer
            scale={scale}
            width={renderedDimensions.width}
            height={renderedDimensions.height}
            activeHighlight={activeHighlight}
            activeBlock={activeBlock}
            scrollContainerRef={scrollContainerRef}
          />

          {/* Layout Inspector Layer (Shows detected blocks and click targets) */}
          <BlockInspectorOverlay
            blocks={currentPageLayout?.blocks || []}
            scale={scale}
            width={renderedDimensions.width}
            height={renderedDimensions.height}
            activeBlockId={activeBlock?.id || null}
            onSelectBlock={onSelectBlock}
            visible={inspectorMode}
          />
        </div>

        {/* Loading Spinner */}
        {isRendering && (
          <div className="absolute top-6 right-6 bg-zinc-900/90 backdrop-blur border border-zinc-800 px-3 py-1.5 rounded-full flex items-center space-x-2 text-xs text-amber-400 shadow-xl z-20">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering page...</span>
          </div>
        )}
      </div>

      {/* Unobtrusive Document Title Badge (Bottom-Right Link Hover Style) */}
      <div className="absolute bottom-3 right-4 px-2.5 py-1 rounded bg-zinc-900/80 backdrop-blur-md border border-zinc-800 text-[11px] text-zinc-400 select-none pointer-events-none tracking-wide z-20 shadow-md flex items-center space-x-2">
        <span className="truncate max-w-[280px] font-medium text-zinc-300">{fileName}</span>
        <span className="text-zinc-600">•</span>
        <span className="font-mono text-zinc-400">Page {currentPage} of {numPages}</span>
      </div>
    </div>
  );
};
