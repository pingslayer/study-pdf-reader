import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCaptionText,
  isCodeSyntax,
  isEquationText,
  isNumberedHeading,
  isPageNumber,
  isDiagramText,
  detectCodeLanguage,
  analyzePageLayout,
} from '../layoutAnalysis.js';
import { ExtractedTextItem } from '../../types/pdf.js';

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

describe('Layout Analysis & Classification Engine (Unit Tests)', () => {
  describe('isCaptionText', () => {
    it('accurately identifies actual figure and table captions', () => {
      assert.equal(isCaptionText('Figure 2.1: Simple Example: Code That Loops And Prints (cpu.c)'), true);
      assert.equal(isCaptionText('Fig. 4.2 - Process State Transitions'), true);
      assert.equal(isCaptionText('Table 1.1: Common POSIX System Calls'), true);
      assert.equal(isCaptionText('Listing 3: Thread Creation with pthreads'), true);
    });

    it('rejects regular prose sentences that refer to a figure in body text', () => {
      // Must NOT falsely classify body sentences as captions!
      assert.equal(isCaptionText('Figure 2.1 depicts our first program. It doesn’t do much.'), false);
      assert.equal(isCaptionText('As seen in Figure 4.2, the process moves to ready state.'), false);
    });
  });

  describe('isCodeSyntax', () => {
    it('detects C source code listings with keywords and braces', () => {
      const cProgram = `#include <stdio.h>
int main(int argc, char *argv[]) {
  printf("Hello, OS!\\n");
  return 0;
}`;
      assert.equal(isCodeSyntax(cProgram), true);
    });

    it('rejects ordinary prose that happens to mention a single keyword', () => {
      assert.equal(isCodeSyntax('We can use printf to debug our application when needed.'), false);
      assert.equal(isCodeSyntax('The return value of the function was checked.'), false);
    });
  });

  describe('isEquationText', () => {
    it('identifies equation labels and mathematical formulas', () => {
      assert.equal(isEquationText('T_turnaround = T_completion - T_arrival (Equation 4.1)'), true);
      assert.equal(isEquationText('(Equation 2.4)'), true);
      assert.equal(isEquationText('J(x1, x2) = sum(x_i)^2 / (n * sum(x_i^2))'), true);
    });

    it('rejects normal descriptive prose about turnaround time', () => {
      assert.equal(isEquationText('Turnaround time is the time at which the job completes minus the arrival time.'), false);
    });
  });

  describe('isNumberedHeading', () => {
    it('identifies chapter titles and numbered sections', () => {
      assert.equal(isNumberedHeading('Chapter 4 Processes'), true);
      assert.equal(isNumberedHeading('2.1 Virtualizing The CPU'), true);
      assert.equal(isNumberedHeading('Section 3 Architecture Overview'), true);
    });

    it('rejects regular body sentences that start with numbers or measurements', () => {
      assert.equal(isNumberedHeading('2.1 seconds elapsed before the timer expired.'), false);
      assert.equal(isNumberedHeading('Chapter members attended the meeting.'), false);
    });
  });

  describe('isPageNumber', () => {
    it('identifies standalone page numbers', () => {
      assert.equal(isPageNumber('3'), true);
      assert.equal(isPageNumber('Page 42'), true);
      assert.equal(isPageNumber('  129  '), true);
    });

    it('rejects numbers embedded within sentences', () => {
      assert.equal(isPageNumber('3 processes were executed concurrently.'), false);
      assert.equal(isPageNumber('Page 4 discusses virtual memory.'), false);
    });
  });

  describe('isDiagramText', () => {
    it('identifies arrow flows in architecture diagrams', () => {
      assert.equal(isDiagramText('READY -> RUNNING'), true);
      assert.equal(isDiagramText('BLOCKED <-- RUNNING'), true);
      assert.equal(isDiagramText('A => B'), true);
    });

    it('identifies uppercase state labels without terminal punctuation', () => {
      assert.equal(isDiagramText('READY RUNNING BLOCKED'), true);
    });

    it('rejects standard prose containing hyphens', () => {
      assert.equal(isDiagramText('A state-of-the-art operating system provides isolation.'), false);
    });
  });

  describe('detectCodeLanguage', () => {
    it('detects C, Python, and JavaScript correctly', () => {
      assert.equal(detectCodeLanguage('#include <stdio.h>\nint main() {}'), 'c');
      assert.equal(detectCodeLanguage('def calculate_metrics():\n    import sys\n    print("done")'), 'python');
      assert.equal(detectCodeLanguage('const handleProcess = () => { console.log("ok"); };'), 'javascript');
    });
  });

  describe('analyzePageLayout (End-to-End)', () => {
    it('classifies a structured academic page into appropriate semantic blocks', () => {
      const mockItems: ExtractedTextItem[] = [
        // Running Header (y < 52)
        createMockItem({ text: 'OPERATING SYSTEMS', x: 50, y: 30, width: 200, height: 10, fontSize: 9, fontName: 'Helvetica', isMonospace: false }),
        // Standalone Page Number (y < 52)
        createMockItem({ text: '3', x: 500, y: 30, width: 10, height: 10, fontSize: 9, fontName: 'Helvetica', isMonospace: false }),
        // Chapter Heading (large font)
        createMockItem({ text: '2.1 Virtualizing The CPU', x: 50, y: 80, width: 280, height: 24, fontSize: 20, fontName: 'Helvetica-Bold', isMonospace: false }),
        // Body paragraph line 1
        createMockItem({ text: 'Figure 2.1 depicts our first program. It does not do much.', x: 50, y: 120, width: 350, height: 12, fontSize: 11, fontName: 'Times-Roman', isMonospace: false }),
        // Body paragraph line 2
        createMockItem({ text: 'In fact, all it does is call Spin, a function that repeatedly checks the time.', x: 50, y: 135, width: 420, height: 12, fontSize: 11, fontName: 'Times-Roman', isMonospace: false }),
        // Code Block (monospace)
        createMockItem({ text: '#include <stdio.h>', x: 70, y: 180, width: 150, height: 11, fontSize: 10, fontName: 'Courier', isMonospace: true }),
        createMockItem({ text: 'int main() {', x: 70, y: 195, width: 120, height: 11, fontSize: 10, fontName: 'Courier', isMonospace: true }),
        createMockItem({ text: '  printf("Hello\\n");', x: 70, y: 210, width: 140, height: 11, fontSize: 10, fontName: 'Courier', isMonospace: true }),
        createMockItem({ text: '  return 0;', x: 70, y: 225, width: 90, height: 11, fontSize: 10, fontName: 'Courier', isMonospace: true }),
        createMockItem({ text: '}', x: 70, y: 240, width: 20, height: 11, fontSize: 10, fontName: 'Courier', isMonospace: true }),
        // Caption
        createMockItem({ text: 'Figure 2.1: Simple Example: Code That Loops', x: 50, y: 270, width: 320, height: 12, fontSize: 10, fontName: 'Helvetica-Oblique', isMonospace: false }),
      ];

      const blocks = analyzePageLayout(mockItems, 1, 595, 842);

      // Verify block types detected
      const types = blocks.map((b) => b.type);
      assert.ok(types.includes('header'), 'Expected running header block');
      assert.ok(types.includes('heading'), 'Expected section heading block');
      assert.ok(types.includes('paragraph'), 'Expected prose paragraph block');
      assert.ok(types.includes('code'), 'Expected code block');
      assert.ok(types.includes('caption'), 'Expected caption block');

      // Verify that the code block has languageHint 'c'
      const codeBlock = blocks.find((b) => b.type === 'code');
      assert.ok(codeBlock, 'Code block should exist');
      assert.equal(codeBlock.languageHint, 'c');
    });
  });
});
