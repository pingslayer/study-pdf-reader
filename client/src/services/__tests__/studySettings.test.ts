import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockReadable, filterReadableBlocks } from '../studySettings.js';
import { PDFBlock, StudySettings } from '../../types/pdf.js';

function createMockBlock(overrides: Partial<PDFBlock>): PDFBlock {
  return {
    id: 'block-test',
    page: 1,
    type: 'paragraph',
    text: 'Sample test prose text.',
    items: [],
    bbox: { x: 50, y: 100, width: 400, height: 20 },
    readingOrderIndex: 0,
    isFiltered: false,
    ...overrides,
  };
}

const defaultSettings: StudySettings = {
  pauseAtHeading: false,
  pauseAtFigure: false,
  pauseAtCode: false,
  skipCodeBlocks: false,
  skipDiagrams: false,
  skipPageNumbers: true,
  skipHeadersFooters: true,
  readCaptions: true,
  readEquations: true,
  readCodeLiterally: true,
};

describe('Study Settings Filtering Engine (Unit Tests)', () => {
  describe('skipHeadersFooters toggle', () => {
    it('skips running headers when skipHeadersFooters is true', () => {
      const headerBlock = createMockBlock({ type: 'header', text: 'OPERATING SYSTEMS IN DEPTH' });
      assert.equal(isBlockReadable(headerBlock, { ...defaultSettings, skipHeadersFooters: true }), false);
    });

    it('reads running headers when skipHeadersFooters is false', () => {
      const headerBlock = createMockBlock({ type: 'header', text: 'OPERATING SYSTEMS IN DEPTH' });
      assert.equal(isBlockReadable(headerBlock, { ...defaultSettings, skipHeadersFooters: false }), true);
    });

    it('skips running footers when skipHeadersFooters is true', () => {
      const footerBlock = createMockBlock({ type: 'footer', text: 'Chapter 2 • Virtualization' });
      assert.equal(isBlockReadable(footerBlock, { ...defaultSettings, skipHeadersFooters: true }), false);
    });

    it('reads running footers when skipHeadersFooters is false', () => {
      const footerBlock = createMockBlock({ type: 'footer', text: 'Chapter 2 • Virtualization' });
      assert.equal(isBlockReadable(footerBlock, { ...defaultSettings, skipHeadersFooters: false }), true);
    });
  });

  describe('skipPageNumbers toggle (Independent of skipHeadersFooters)', () => {
    it('skips standalone page numbers when skipPageNumbers is true', () => {
      const pageNumBlock = createMockBlock({ isPageNumber: true, text: '3' });
      assert.equal(isBlockReadable(pageNumBlock, { ...defaultSettings, skipPageNumbers: true }), false);
    });

    it('reads page numbers when skipPageNumbers is false', () => {
      const pageNumBlock = createMockBlock({ isPageNumber: true, text: '3' });
      assert.equal(isBlockReadable(pageNumBlock, { ...defaultSettings, skipPageNumbers: false }), true);
    });

    it('INDIVIDUAL INDEPENDENCE: page numbers are skipped even if skipHeadersFooters is OFF', () => {
      const pageNumBlock = createMockBlock({ isPageNumber: true, text: '42' });
      const settings: StudySettings = {
        ...defaultSettings,
        skipHeadersFooters: false,
        skipPageNumbers: true,
      };
      assert.equal(isBlockReadable(pageNumBlock, settings), false);
    });

    it('INDIVIDUAL INDEPENDENCE: page numbers are read if skipPageNumbers is OFF even if skipHeadersFooters is ON', () => {
      const pageNumBlock = createMockBlock({ isPageNumber: true, text: '42' });
      const settings: StudySettings = {
        ...defaultSettings,
        skipHeadersFooters: true,
        skipPageNumbers: false,
      };
      assert.equal(isBlockReadable(pageNumBlock, settings), true);
    });
  });

  describe('skipDiagrams toggle', () => {
    it('skips diagram text labels when skipDiagrams is true', () => {
      const diagramBlock = createMockBlock({ type: 'figure', isDiagram: true, text: 'READY -> RUNNING' });
      assert.equal(isBlockReadable(diagramBlock, { ...defaultSettings, skipDiagrams: true }), false);
    });

    it('reads diagram text labels when skipDiagrams is false', () => {
      const diagramBlock = createMockBlock({ type: 'figure', isDiagram: true, text: 'READY -> RUNNING' });
      assert.equal(isBlockReadable(diagramBlock, { ...defaultSettings, skipDiagrams: false }), true);
    });
  });

  describe('skipCodeBlocks toggle', () => {
    it('skips code blocks when skipCodeBlocks is true', () => {
      const codeBlock = createMockBlock({ type: 'code', text: 'int main() { return 0; }' });
      assert.equal(isBlockReadable(codeBlock, { ...defaultSettings, skipCodeBlocks: true }), false);
    });

    it('reads code blocks when skipCodeBlocks is false', () => {
      const codeBlock = createMockBlock({ type: 'code', text: 'int main() { return 0; }' });
      assert.equal(isBlockReadable(codeBlock, { ...defaultSettings, skipCodeBlocks: false }), true);
    });
  });

  describe('readCaptions toggle', () => {
    it('reads captions when readCaptions is true', () => {
      const captionBlock = createMockBlock({ type: 'caption', text: 'Figure 2.1: Simple Example Code' });
      assert.equal(isBlockReadable(captionBlock, { ...defaultSettings, readCaptions: true }), true);
    });

    it('skips captions when readCaptions is false', () => {
      const captionBlock = createMockBlock({ type: 'caption', text: 'Figure 2.1: Simple Example Code' });
      assert.equal(isBlockReadable(captionBlock, { ...defaultSettings, readCaptions: false }), false);
    });
  });

  describe('readEquations toggle', () => {
    it('reads mathematical equations when readEquations is true', () => {
      const eqBlock = createMockBlock({ type: 'equation', text: 'T_turnaround = T_completion - T_arrival' });
      assert.equal(isBlockReadable(eqBlock, { ...defaultSettings, readEquations: true }), true);
    });

    it('skips mathematical equations when readEquations is false', () => {
      const eqBlock = createMockBlock({ type: 'equation', text: 'T_turnaround = T_completion - T_arrival' });
      assert.equal(isBlockReadable(eqBlock, { ...defaultSettings, readEquations: false }), false);
    });
  });

  describe('filterReadableBlocks integration', () => {
    it('filters a complex textbook page correctly under default settings', () => {
      const blocks: PDFBlock[] = [
        createMockBlock({ id: 'b1', type: 'header', text: 'OSTEP CHAPTER 4' }),
        createMockBlock({ id: 'b2', isPageNumber: true, text: '3' }),
        createMockBlock({ id: 'b3', type: 'heading', text: '4.1 The Abstraction: A Process' }),
        createMockBlock({ id: 'b4', type: 'paragraph', text: 'In this chapter, we discuss processes.' }),
        createMockBlock({ id: 'b5', type: 'code', text: '#include <stdio.h>\nint main() { return 0; }' }),
        createMockBlock({ id: 'b6', type: 'caption', text: 'Figure 4.1: Code That Prints' }),
        createMockBlock({ id: 'b7', type: 'equation', text: '(Equation 4.1) T = C - A' }),
        createMockBlock({ id: 'b8', type: 'footer', text: 'Page 3 of 20' }),
      ];

      const readable = filterReadableBlocks(blocks, defaultSettings);
      const readableIds = readable.map((b) => b.id);

      // Default should include: Heading (b3), Prose (b4), Code (b5), Caption (b6), Equation (b7)
      // and skip: Header (b1), Standalone Page Number (b2), Footer (b8)
      assert.deepEqual(readableIds, ['b3', 'b4', 'b5', 'b6', 'b7']);
    });
  });
});
