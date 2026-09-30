import React, { useEffect, useRef } from 'react';
import { BoundingBox, PDFBlock } from '../../types/pdf';

interface HighlightLayerProps {
  scale: number;
  width: number;
  height: number;
  activeHighlight: BoundingBox | null;
  activeBlock: PDFBlock | null;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

export const HighlightLayer: React.FC<HighlightLayerProps> = ({
  scale,
  width,
  height,
  activeHighlight,
  activeBlock,
  scrollContainerRef,
}) => {
  const highlightRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when word highlight changes
  useEffect(() => {
    if (!activeHighlight || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const highlightTop = activeHighlight.y * scale;
    const highlightBottom = (activeHighlight.y + activeHighlight.height) * scale;
    const containerTop = container.scrollTop;
    const containerBottom = containerTop + container.clientHeight;

    // Check if highlight is out of visible view or near edge (within 80px)
    if (highlightTop < containerTop + 80 || highlightBottom > containerBottom - 80) {
      container.scrollTo({
        top: Math.max(0, highlightTop - 140),
        behavior: 'smooth',
      });
    }
  }, [activeHighlight, scale, scrollContainerRef]);

  return (
    <div
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Active Block Focus Boundary */}
      {activeBlock && (
        <div
          className="absolute rounded-lg border-2 border-sky-400/40 bg-sky-500/5 transition-all duration-300 pointer-events-none"
          style={{
            left: `${(activeBlock.bbox.x - 4) * scale}px`,
            top: `${(activeBlock.bbox.y - 3) * scale}px`,
            width: `${(activeBlock.bbox.width + 8) * scale}px`,
            height: `${(activeBlock.bbox.height + 6) * scale}px`,
          }}
        />
      )}

      {/* Word-Level Narration Highlight Overlay */}
      {activeHighlight && (
        <div
          ref={highlightRef}
          className="absolute rounded bg-amber-400/45 border-b-2 border-amber-500/90 shadow-sm pointer-events-none transition-[left,top,width] duration-30 ease-linear"
          style={{
            left: `${activeHighlight.x * scale}px`,
            top: `${activeHighlight.y * scale}px`,
            width: `${Math.max(4, activeHighlight.width * scale)}px`,
            height: `${activeHighlight.height * scale}px`,
          }}
        />
      )}
    </div>
  );
};
