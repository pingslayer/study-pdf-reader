import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { HighlightLayer } from './HighlightLayer';
import { BlockInspectorOverlay } from './BlockInspectorOverlay';
import { PageLayoutData, PDFBlock, BoundingBox } from '../../types/pdf';
import { pdfService } from '../../services/pdfService';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  currentPage: number;
  numPages: number;
  currentPageLayout: PageLayoutData | null;
  activeBlock: PDFBlock | null;
  activeHighlight: BoundingBox | null;
  inspectorMode: boolean;
  scale: number;
  readCodeLiterally: boolean;
  onScaleChange: (scale: number) => void;
  onPageChange: (page: number) => void;
  onSelectBlock: (block: PDFBlock) => void;
  onToggleCodeLiterally: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  currentPage,
  numPages,
  currentPageLayout,
  activeBlock,
  activeHighlight,
  inspectorMode,
  scale,
  readCodeLiterally,
  onScaleChange,
  onPageChange,
  onSelectBlock,
  onToggleCodeLiterally,
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
  }, [currentPage, scale, numPages]);

  // Fit Width handler
  const handleFitWidth = useCallback(() => {
    if (!scrollContainerRef.current || !currentPageLayout) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 48; // padding
    const pageWidth = currentPageLayout.width || 595;
    const newScale = Math.max(0.4, Math.min(2.5, containerWidth / pageWidth));
    onScaleChange(Math.round(newScale * 100) / 100);
  }, [currentPageLayout, onScaleChange]);

  // Fit Page handler
  const handleFitPage = useCallback(() => {
    if (!scrollContainerRef.current || !currentPageLayout) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 48;
    const containerHeight = scrollContainerRef.current.clientHeight - 48;
    const pageWidth = currentPageLayout.width || 595;
    const pageHeight = currentPageLayout.height || 842;
    const scaleW = containerWidth / pageWidth;
    const scaleH = containerHeight / pageHeight;
    const newScale = Math.max(0.4, Math.min(2.5, Math.min(scaleW, scaleH)));
    onScaleChange(Math.round(newScale * 100) / 100);
  }, [currentPageLayout, onScaleChange]);

  const isCodeActive = activeBlock?.type === 'code';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden relative">
      {/* Top Toolbar */}
      <Toolbar
        currentPage={currentPage}
        numPages={numPages}
        scale={scale}
        onPageChange={onPageChange}
        onScaleChange={onScaleChange}
        onFitWidth={handleFitWidth}
        onFitPage={handleFitPage}
        isCodeActive={isCodeActive}
        readCodeLiterally={readCodeLiterally}
        onToggleCodeLiterally={onToggleCodeLiterally}
      />

      {/* Main PDF Scroll Viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950 relative"
      >
        <div className="relative shadow-2xl rounded-sm border border-slate-700/60 bg-white">
          {/* Canvas Rendering the Original PDF Page */}
          <canvas ref={canvasRef} className="block shadow-md rounded-sm" />

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
          <div className="absolute top-8 right-8 bg-slate-900/80 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-full flex items-center space-x-2 text-xs text-sky-400 shadow-lg">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Rendering PDF...</span>
          </div>
        )}
      </div>
    </div>
  );
};
