import { ExtractedTextItem, PDFBlock, BlockType } from '../types/pdf';

interface Line {
  items: ExtractedTextItem[];
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isMonospace: boolean;
}

export function analyzePageLayout(
  items: ExtractedTextItem[],
  pageNumber: number,
  _pageWidth: number,
  pageHeight: number
): PDFBlock[] {
  if (items.length === 0) return [];

  // Step 1: Group items into lines
  const lines = groupItemsIntoLines(items);

  // Step 2: Calculate median body font size
  const fontSizes = lines.map(l => l.fontSize).sort((a, b) => a - b);
  const medianFontSize = fontSizes[Math.floor(fontSizes.length / 2)] || 11;

  // Step 3: Segment lines into coherent blocks
  const rawBlocks = segmentLinesIntoBlocks(lines, medianFontSize, pageHeight);

  // Step 4: Classify block types and compute reading order
  const classifiedBlocks: PDFBlock[] = [];
  let readingOrderCounter = 0;

  for (let i = 0; i < rawBlocks.length; i++) {
    const raw = rawBlocks[i];
    const blockType = classifyBlock(raw, medianFontSize, pageHeight);
    
    // Check if header, footer, or page number
    const isHeaderFooter = blockType === 'header' || blockType === 'footer';
    const isPageNum = isPageNumber(raw.text);
    const isDiagram = blockType === 'figure';

    const blockId = `p${pageNumber}-b${i + 1}`;
    
    // Assign blockId to child text items
    raw.items.forEach(it => {
      it.blockId = blockId;
    });

    const block: PDFBlock = {
      id: blockId,
      page: pageNumber,
      type: blockType,
      text: raw.text,
      items: raw.items,
      bbox: {
        x: Math.round(raw.x * 10) / 10,
        y: Math.round(raw.y * 10) / 10,
        width: Math.round(raw.width * 10) / 10,
        height: Math.round(raw.height * 10) / 10,
      },
      readingOrderIndex: isHeaderFooter ? -1 : readingOrderCounter++,
      isFiltered: isHeaderFooter || isPageNum || isDiagram,
      isHeaderFooter,
      isPageNumber: isPageNum,
      isDiagram,
      headingLevel: blockType === 'heading' ? getHeadingLevel(raw.fontSize, medianFontSize) : undefined,
      languageHint: blockType === 'code' ? detectCodeLanguage(raw.text) : undefined,
    };

    classifiedBlocks.push(block);
  }

  // Step 4b: Re-classify floating diagram label blocks positioned in the spatial vicinity of captions
  const captionBlocks = classifiedBlocks.filter(b => b.type === 'caption');
  for (const caption of captionBlocks) {
    for (const b of classifiedBlocks) {
      if (b.type === 'paragraph' && b.id !== caption.id) {
        const verticalDist = Math.abs(b.bbox.y - caption.bbox.y);
        if (verticalDist <= 160) {
          const isShortOrFragment = b.text.trim().split(/\s+/).length <= 20;
          const hasDiagramFeatures = isDiagramText(b.text) || !/[.!?]$/.test(b.text.trim());
          if (isShortOrFragment && hasDiagramFeatures) {
            b.type = 'figure';
            b.isDiagram = true;
            b.isFiltered = true;
          }
        }
      }
    }
  }

  // Step 5: Merge consecutive code blocks separated by blank lines
  const mergedBlocks: PDFBlock[] = [];
  for (let i = 0; i < classifiedBlocks.length; i++) {
    const curr = classifiedBlocks[i];
    if (mergedBlocks.length > 0) {
      const prev = mergedBlocks[mergedBlocks.length - 1];
      if (
        prev.type === 'code' &&
        curr.type === 'code' &&
        curr.bbox.y - (prev.bbox.y + prev.bbox.height) <= 120
      ) {
        // Merge curr into prev
        prev.items.push(...curr.items);
        prev.text = prev.text + '\n' + curr.text;
        const minX = Math.min(prev.bbox.x, curr.bbox.x);
        const minY = Math.min(prev.bbox.y, curr.bbox.y);
        const maxX = Math.max(prev.bbox.x + prev.bbox.width, curr.bbox.x + curr.bbox.width);
        const maxY = Math.max(prev.bbox.y + prev.bbox.height, curr.bbox.y + curr.bbox.height);
        prev.bbox = {
          x: Math.round(minX * 10) / 10,
          y: Math.round(minY * 10) / 10,
          width: Math.round((maxX - minX) * 10) / 10,
          height: Math.round((maxY - minY) * 10) / 10,
        };
        curr.items.forEach(it => {
          it.blockId = prev.id;
        });
        continue;
      }
    }
    mergedBlocks.push(curr);
  }

  // Step 6: Sort readable blocks into reading order (top-to-bottom)
  const readableBlocks = mergedBlocks.filter(b => !b.isFiltered);
  readableBlocks.sort((a, b) => a.bbox.y - b.bbox.y);
  readableBlocks.forEach((b, idx) => {
    b.readingOrderIndex = idx;
  });

  return mergedBlocks;
}

function groupItemsIntoLines(items: ExtractedTextItem[]): Line[] {
  // Sort primarily by vertical coordinate y, then x
  const sorted = [...items].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) <= 4) {
      return a.x - b.x;
    }
    return yDiff;
  });

  const lines: Line[] = [];

  for (const item of sorted) {
    // Find matching existing line within vertical baseline tolerance
    const line = lines.find(l => Math.abs(l.y - item.y) <= Math.max(4, item.fontSize * 0.4));

    if (line) {
      // Determine if a space is needed between previous item and this item
      const lastItem = line.items[line.items.length - 1];
      const gap = item.x - (lastItem.x + lastItem.width);
      const space = gap > 0.8 || lastItem.text.endsWith(' ') || item.text.startsWith(' ') ? ' ' : '';
      
      line.items.push(item);
      line.text += space + item.text;
      const minX = Math.min(line.x, item.x);
      const maxX = Math.max(line.x + line.width, item.x + item.width);
      line.x = minX;
      line.width = maxX - minX;
      line.height = Math.max(line.height, item.height);
      line.fontSize = Math.max(line.fontSize, item.fontSize);
    } else {
      lines.push({
        items: [item],
        text: item.text,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fontSize: item.fontSize,
        isMonospace: false,
      });
    }
  }

  // Ensure items within each line are sorted left to right
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  // Calculate line.isMonospace: true if monospace characters represent >= 45% of total characters,
  // or if the line has explicit code syntax keywords, preventing inline code words (e.g. Spin() or cpu.c)
  // in normal English sentences from toggling the entire line into code.
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const monoChars = line.items.reduce((s, it) => s + (it.isMonospace ? it.text.length : 0), 0);
    const totalChars = line.items.reduce((s, it) => s + it.text.length, 0) || 1;
    const hasCodeSyntax = /^(#include|\d+\s*(#include|int|char|while|Spin|printf|return|if|\{|\}))/.test(line.text.trim());
    line.isMonospace = (monoChars / totalChars) >= 0.45 || hasCodeSyntax;
    // Continuation line number in code listing e.g. "6"
    if (!line.isMonospace && i > 0 && lines[i - 1].isMonospace && /^\d+$/.test(line.text.trim())) {
      line.isMonospace = true;
    }
  }

  return lines;
}

interface RawBlock {
  lines: Line[];
  items: ExtractedTextItem[];
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  isMonospace: boolean;
}

function segmentLinesIntoBlocks(
  lines: Line[],
  medianFontSize: number,
  pageHeight: number
): RawBlock[] {
  if (lines.length === 0) return [];

  const blocks: RawBlock[] = [];
  let currentLines: Line[] = [lines[0]];

  for (let i = 1; i < lines.length; i++) {
    const prevLine = lines[i - 1];
    const currLine = lines[i];

    const prevBottom = prevLine.y + prevLine.height;
    const verticalGap = currLine.y - prevBottom;

    // Conditions that trigger a new block:
    const isFontDifferent = Math.abs(currLine.fontSize - prevLine.fontSize) >= 2;
    const isMonoToggled = currLine.isMonospace !== prevLine.isMonospace;
    const isHeading = currLine.fontSize >= medianFontSize * 1.25 || isNumberedHeading(currLine.text);
    const isPrevHeading = prevLine.fontSize >= medianFontSize * 1.25 || isNumberedHeading(prevLine.text);
    const isLargeGap = verticalGap > Math.max(8, prevLine.fontSize * 0.9);
    // Natural paragraph start: indented line or follows a short terminated line
    const isParagraphBreak = (currLine.x - prevLine.x >= 8) || (currLine.x >= 66 && (prevLine.x + prevLine.width) < 335);
    const isHeaderArea = currLine.y < 50 || prevLine.y < 50;
    const isFooterArea = currLine.y > pageHeight - 55 || prevLine.y > pageHeight - 55;
    const isCaption = isCaptionText(currLine.text);
    const isPrevCaption = isCaptionText(prevLine.text);

    if (
      isFontDifferent ||
      isMonoToggled ||
      isHeading ||
      isPrevHeading ||
      isLargeGap ||
      isParagraphBreak ||
      isHeaderArea ||
      isFooterArea ||
      isCaption ||
      isPrevCaption
    ) {
      blocks.push(buildRawBlock(currentLines));
      currentLines = [currLine];
    } else {
      currentLines.push(currLine);
    }
  }

  if (currentLines.length > 0) {
    blocks.push(buildRawBlock(currentLines));
  }

  return blocks;
}

function buildRawBlock(lines: Line[]): RawBlock {
  const allItems: ExtractedTextItem[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxFontSize = 0;
  let hasMono = false;

  const textLines: string[] = [];

  for (const line of lines) {
    allItems.push(...line.items);
    minX = Math.min(minX, line.x);
    minY = Math.min(minY, line.y);
    maxX = Math.max(maxX, line.x + line.width);
    maxY = Math.max(maxY, line.y + line.height);
    maxFontSize = Math.max(maxFontSize, line.fontSize);
    if (line.isMonospace) hasMono = true;
    textLines.push(line.text.trim());
  }

  return {
    lines,
    items: allItems,
    text: textLines.join('\n'),
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    fontSize: maxFontSize,
    isMonospace: hasMono,
  };
}

function classifyBlock(
  block: RawBlock,
  medianFontSize: number,
  pageHeight: number
): BlockType {
  const trimmed = block.text.trim();

  // 1. Header detection: near top of page (top 50 points)
  if (block.y < 52 && (block.lines.length <= 2 || trimmed.length < 80)) {
    return 'header';
  }

  // 2. Footer detection: near bottom of page (within 55 points of bottom)
  if (block.y + block.height > pageHeight - 55) {
    return 'footer';
  }

  // 3. Caption detection
  if (isCaptionText(trimmed)) {
    return 'caption';
  }

  // 4. Diagram / figure label detection (e.g. arrows, state labels)
  if (isDiagramText(trimmed)) {
    return 'figure';
  }

  // 5. Code block detection:
  // Monospace font OR code indicators like #include, int main, curly braces, printf
  if (block.isMonospace && !isEquationText(trimmed)) {
    return 'code';
  }
  if (isCodeSyntax(trimmed)) {
    return 'code';
  }

  // 6. Equation detection
  if (isEquationText(trimmed)) {
    return 'equation';
  }

  // 7. Heading detection: font size noticeably larger than median or section pattern
  if (block.fontSize >= medianFontSize * 1.25 || isNumberedHeading(trimmed)) {
    return 'heading';
  }

  // 8. List detection
  if (/^([•\-\*]|\d+\.|\([a-z\d]+\))\s+/i.test(trimmed)) {
    return 'list';
  }

  // Default to paragraph
  return 'paragraph';
}

export function isDiagramText(text: string): boolean {
  const t = text.trim();
  // Contains diagram arrow symbols e.g. ->, <-, -->, <--
  if (t.includes('->') || t.includes('<-') || t.includes('-->') || t.includes('<--') || t.includes('=>')) {
    return true;
  }
  // Short block with multiple uppercase words (e.g. READY, RUNNING, BLOCKED)
  const words = t.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2 && words.length <= 10) {
    const uppercaseWords = words.filter(w => /^[A-Z0-9_\-]+$/.test(w.replace(/[^a-zA-Z0-9_\-]/g, '')));
    if (uppercaseWords.length / words.length >= 0.7 && !/[.!?]$/.test(t)) {
      return true;
    }
  }
  return false;
}

export function isNumberedHeading(text: string): boolean {
  const t = text.trim();
  if (/^(Chapter|Section)\s+\d+/i.test(t)) return true;
  // Numbered sections e.g. "2.1 Virtualizing", "4.1.2 Process States"
  // Must be followed by a capitalized heading word (case-sensitive) to avoid matching "2.1 seconds"
  return /^\d+\.\d+(\.\d+)?\s+[A-Z]/.test(t);
}

export function isCaptionText(text: string): boolean {
  // Real captions have a caption label followed by a delimiter (colon, dash, period with title)
  // e.g. "Figure 2.1: Simple Example...", not body sentences like "Figure 2.1 depicts our first program."
  return /^(Figure|Fig\.|Diagram|Table|Listing|Chart)\s+\d+(\.\d+)?\s*[:\-\—]/i.test(text.trim());
}

export function isEquationText(text: string): boolean {
  const t = text.trim();
  // Check for equation label e.g. "(Equation 4.1)" or "(4.1)"
  const hasEqLabel = /\((Equation\s+)?\d+(\.\d+)?\)$/i.test(t);
  const mathSymbols = /[=+\-×/^_∑∫λσμπαβγ]/;
  
  if (hasEqLabel) return true;
  if (mathSymbols.test(t) && (t.includes('T_') || t.includes('J(') || t.includes('sum(') || t.includes('sqrt('))) {
    return true;
  }
  return false;
}

export function isCodeSyntax(text: string): boolean {
  const codeIndicators = [
    '#include',
    'int main',
    'printf(',
    'getpid()',
    'fork()',
    'return 0;',
    'void ',
    'struct ',
    'typedef ',
    '#define',
    'malloc(',
    'sizeof(',
  ];

  let matches = 0;
  for (const indicator of codeIndicators) {
    if (text.includes(indicator)) matches++;
  }

  return matches >= 2 || (text.includes('{') && text.includes('}') && matches >= 1);
}

export function isPageNumber(text: string): boolean {
  const trimmed = text.trim();
  return /^(Page\s*)?\d+$/i.test(trimmed);
}

export function getHeadingLevel(fontSize: number, medianFontSize: number): number {
  if (fontSize >= medianFontSize * 1.8) return 1;
  if (fontSize >= medianFontSize * 1.4) return 2;
  return 3;
}

export function detectCodeLanguage(text: string): string {
  if (text.includes('#include') || text.includes('printf(') || text.includes('int main')) return 'c';
  if (text.includes('def ') || text.includes('import ') || text.includes('print(')) return 'python';
  if (text.includes('function ') || text.includes('const ') || text.includes('console.log')) return 'javascript';
  return 'code';
}
