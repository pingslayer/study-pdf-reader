import { PDFBlock, StudySettings } from '../types/pdf';

/**
 * Evaluates whether a PDF block should be queued for reading
 * according to the active study settings. Every toggle operates
 * completely independently without coupled blanket filtering.
 */
export function isBlockReadable(block: PDFBlock, settings: StudySettings): boolean {
  // 1. Running headers & footers
  if ((block.isHeaderFooter || block.type === 'header' || block.type === 'footer') && settings.skipHeadersFooters) {
    return false;
  }

  // 2. Standalone page numbers
  if (block.isPageNumber && settings.skipPageNumbers) {
    return false;
  }

  // 3. Diagrams & visual graphic labels
  if ((block.isDiagram || block.type === 'figure') && settings.skipDiagrams) {
    return false;
  }

  // 4. Code listings
  if (block.type === 'code' && settings.skipCodeBlocks) {
    return false;
  }

  // 5. Captions beneath figures & diagrams
  if (block.type === 'caption' && !settings.readCaptions) {
    return false;
  }

  // 6. Mathematical equations
  if (block.type === 'equation' && !settings.readEquations) {
    return false;
  }

  return true;
}

/**
 * Filter an array of blocks using the active study settings.
 */
export function filterReadableBlocks(blocks: PDFBlock[], settings: StudySettings): PDFBlock[] {
  return blocks.filter((b) => isBlockReadable(b, settings));
}
