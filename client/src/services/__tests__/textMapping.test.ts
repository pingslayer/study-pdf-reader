import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWord,
  buildVisualTokensFromBlock,
  buildVisualTokensFromAlignment,
  findMatchingVisualToken,
  VisualToken,
} from '../textMapping.js';
import { PDFBlock, ExtractedTextItem } from '../../types/pdf.js';
import { WordAlignment } from '../ttsClient.js';

function createMockItem(overrides: Partial<ExtractedTextItem>): ExtractedTextItem {
  return {
    id: 'item-' + Math.random().toString(36).slice(2, 7),
    page: 1,
    text: '',
    x: 0,
    y: 0,
    width: 50,
    height: 12,
    fontSize: 11,
    fontName: 'Helvetica',
    isMonospace: false,
    blockId: '',
    ...overrides,
  };
}

describe('Word Highlighting & Alignment Mapping Engine (Unit Tests)', () => {
  describe('normalizeWord', () => {
    it('strips leading and trailing punctuation while preserving inner characters', () => {
      assert.equal(normalizeWord('Hello,'), 'hello');
      assert.equal(normalizeWord('"Virtualization"'), 'virtualization');
      assert.equal(normalizeWord('(main)'), 'main');
      assert.equal(normalizeWord('argv[1];'), 'argv[1');
    });

    it('converts en-dashes and em-dashes to standard hyphen', () => {
      assert.equal(normalizeWord('pre–requisite'), 'pre-requisite');
      assert.equal(normalizeWord('time—sharing'), 'time-sharing');
    });

    it('preserves code symbols like # and &', () => {
      assert.equal(normalizeWord('#include'), '#include');
      assert.equal(normalizeWord('A&B'), 'a&b');
    });
  });

  describe('buildVisualTokensFromBlock', () => {
    it('extracts word tokens with bounding boxes from block text items', () => {
      const mockBlock: PDFBlock = {
        id: 'p1-b1',
        page: 1,
        type: 'paragraph',
        text: 'The operating system virtualizes the CPU.',
        items: [
          createMockItem({ text: 'The operating system ', x: 50, y: 100, width: 120, height: 12, fontSize: 11, fontName: 'Helvetica', isMonospace: false, blockId: 'p1-b1' }),
          createMockItem({ text: 'virtualizes the CPU.', x: 175, y: 100, width: 110, height: 12, fontSize: 11, fontName: 'Helvetica', isMonospace: false, blockId: 'p1-b1' }),
        ],
        bbox: { x: 50, y: 100, width: 235, height: 12 },
        readingOrderIndex: 0,
        isFiltered: false,
      };

      const tokens = buildVisualTokensFromBlock(mockBlock);
      const words = tokens.map((t) => t.word);

      assert.deepEqual(words, ['The', 'operating', 'system', 'virtualizes', 'the', 'CPU.']);
      assert.equal(tokens[0].bbox.x, 50);
      assert.ok(tokens[0].bbox.width > 0);
    });

    it('resolves line-break hyphenation for lone single-word items', () => {
      const mockBlock: PDFBlock = {
        id: 'p1-b2',
        page: 1,
        type: 'paragraph',
        text: 'in- structions executed by the hardware.',
        items: [
          // Lone word on line N ending with hyphen
          createMockItem({ text: 'in-', x: 50, y: 100, width: 25, height: 12, fontSize: 11, fontName: 'Helvetica', isMonospace: false, blockId: 'p1-b2' }),
          // Continuation word on line N+1
          createMockItem({ text: 'structions executed by the hardware.', x: 50, y: 115, width: 200, height: 12, fontSize: 11, fontName: 'Helvetica', isMonospace: false, blockId: 'p1-b2' }),
        ],
        bbox: { x: 50, y: 100, width: 200, height: 27 },
        readingOrderIndex: 0,
        isFiltered: false,
      };

      const tokens = buildVisualTokensFromBlock(mockBlock);
      assert.equal(tokens[0].word, 'instructions');
      assert.equal(tokens[0].subBoxes.length, 2, 'Should create 2 subBoxes spanning both lines');
      assert.equal(tokens[0].subBoxes[0].y, 100);
      assert.equal(tokens[0].subBoxes[1].y, 115);
    });
  });

  describe('buildVisualTokensFromAlignment', () => {
    it('maps TTS alignment words 1-to-1 to PDF layout bounding boxes', () => {
      const mockBlock: PDFBlock = {
        id: 'p1-b3',
        page: 1,
        type: 'code',
        text: '#include <stdio.h>\nint main()',
        items: [
          createMockItem({ text: '#include <stdio.h>', x: 50, y: 100, width: 140, height: 12, fontSize: 10, fontName: 'Courier', isMonospace: true, blockId: 'p1-b3' }),
          createMockItem({ text: 'int main()', x: 50, y: 115, width: 80, height: 12, fontSize: 10, fontName: 'Courier', isMonospace: true, blockId: 'p1-b3' }),
        ],
        bbox: { x: 50, y: 100, width: 140, height: 27 },
        readingOrderIndex: 0,
        isFiltered: false,
      };

      const mockAlignment: WordAlignment[] = [
        { word: '#include', start: 0, end: 400 },
        { word: '<stdio.h>', start: 410, end: 950 },
        { word: 'int', start: 960, end: 1200 },
        { word: 'main', start: 1210, end: 1500 },
      ];

      const tokens = buildVisualTokensFromAlignment(mockBlock, mockAlignment);
      assert.equal(tokens.length, 4);
      assert.equal(tokens[0].word, '#include');
      assert.equal(tokens[1].word, '<stdio.h>');
      assert.equal(tokens[2].word, 'int');
      assert.equal(tokens[3].word, 'main');

      // Verify that coordinates advance downwards
      assert.equal(tokens[0].bbox.y, 100);
      assert.equal(tokens[2].bbox.y, 115);
    });
  });

  describe('findMatchingVisualToken (Priority Engine)', () => {
    const mockTokens: VisualToken[] = [
      { word: 'The', normalized: 'the', itemIndices: [0], charStart: 0, charEnd: 3, bbox: { x: 50, y: 100, width: 20, height: 12 }, subBoxes: [] },
      { word: 'CPU', normalized: 'cpu', itemIndices: [0], charStart: 4, charEnd: 7, bbox: { x: 75, y: 100, width: 25, height: 12 }, subBoxes: [] },
      { word: 'executes', normalized: 'executes', itemIndices: [0], charStart: 8, charEnd: 16, bbox: { x: 105, y: 100, width: 45, height: 12 }, subBoxes: [] },
      { word: 'instructions.', normalized: 'instructions', itemIndices: [0], charStart: 17, charEnd: 30, bbox: { x: 155, y: 100, width: 70, height: 12 }, subBoxes: [] },
    ];

    it('Priority 1: Matches immediately by wordIndex for zero-drift long streams', () => {
      const result = findMatchingVisualToken('CPU', mockTokens, 0, undefined, 1);
      assert.ok(result);
      assert.equal(result.index, 1);
      assert.equal(result.token.word, 'CPU');
    });

    it('Priority 2: Matches within +/- 2 token neighborhood if wordIndex slightly off', () => {
      const result = findMatchingVisualToken('executes', mockTokens, 0, undefined, 1); // sent wordIndex 1, but 'executes' is at 2
      assert.ok(result);
      assert.equal(result.index, 2);
    });

    it('Priority 3: Matches by character offset when wordIndex is omitted', () => {
      const result = findMatchingVisualToken('instructions', mockTokens, 0, 18, undefined);
      assert.ok(result);
      assert.equal(result.index, 3);
    });

    it('Priority 6: Clamps fallback to safe index rather than disappearing or jumping backwards to 0', () => {
      const result = findMatchingVisualToken('unknown_word', mockTokens, 2, undefined, 2);
      assert.ok(result);
      assert.equal(result.index, 2); // Stays at current index 2
    });
  });
});
