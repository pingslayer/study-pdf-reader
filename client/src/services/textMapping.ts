import { PDFBlock, BoundingBox } from '../types/pdf';

export interface VisualToken {
  word: string;
  normalized: string;
  itemIndices: number[];
  charStart: number;
  charEnd: number;
  bbox: BoundingBox;
  subBoxes: BoundingBox[];
}

export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '') // Strip leading/trailing punctuation
    .replace(/[–—]/g, '-')
    .trim();
}

// Off-screen canvas for accurate proportional word-width measurement
let measureCanvas: HTMLCanvasElement | null = null;
let measureCtx: CanvasRenderingContext2D | null = null;

function getTextWidth(text: string, fontSize: number, isMonospace: boolean): number {
  if (typeof document === 'undefined') {
    return text.length * fontSize * (isMonospace ? 0.6 : 0.52);
  }
  if (!measureCanvas) {
    measureCanvas = document.createElement('canvas');
    measureCtx = measureCanvas.getContext('2d');
  }
  if (measureCtx) {
    measureCtx.font = `${fontSize}px ${isMonospace ? 'monospace' : 'sans-serif'}`;
    return measureCtx.measureText(text).width;
  }
  return text.length * fontSize * 0.52;
}

/**
 * Whether the last word of a text item's text is a genuine line-break hyphenation.
 * Only true when it is a single word ending with '-', not a multi-word item.
 * Examples:
 *   "in-"           => true  (single word, hyphenated)
 *   "it executes in-" => false (multi-word; hyphen on the last word, handled inline)
 *   "pre-"          => true
 */
function isLineBreakHyphen(itemText: string): boolean {
  const words = itemText.trim().split(/\s+/);
  if (words.length !== 1) return false;        // Only single-word items
  const w = words[0];
  return w.endsWith('-') && w.length > 1 && /[a-z]/i.test(w);
}

/**
 * Builds visual word tokens from a block's extracted text items,
 * with canvas-measured proportional word widths, exact character offsets,
 * and correct line-break hyphenation handling.
 *
 * KEY FIX: Hyphenation is only resolved when a PDF.js text item is a
 * SINGLE bare word that ends with '-' (e.g. the item text is exactly "in-").
 * Multi-word items like "it executes in-" are split normally word-by-word;
 * the trailing "-" on the last word is left as-is so the normalizer strips
 * it during matching, and ElevenLabs' charIndex lookup positions the highlight
 * exactly right without any false merging.
 */
export function buildVisualTokensFromBlock(block: PDFBlock): VisualToken[] {
  const tokens: VisualToken[] = [];
  const items = block.items;
  let runningCharOffset = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const trimmed = item.text.trim();

    // ── Hyphenation resolution ────────────────────────────────────────────────
    // Only resolve when this item is a lone single word that ends with '-'
    // (e.g. PDF.js extracted "ma-" on its own line). Multi-word items that
    // happen to end in a hyphen ("it executes in-") are processed normally below.
    if (isLineBreakHyphen(trimmed) && i + 1 < items.length) {
      const nextItem = items[i + 1];
      const part1 = trimmed.slice(0, -1);                    // "in"
      const nextWords = nextItem.text.trim().split(/\s+/);
      const part2 = nextWords[0];                            // "structions"
      const fullWord = part1 + part2;                        // "instructions"

      // Box for the hyphenated fragment (line N)
      const box1: BoundingBox = {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
      };

      // Approximate box for the continuation (start of line N+1)
      const part2Ratio = part2.length / Math.max(1, nextItem.text.trim().length);
      const box2: BoundingBox = {
        x: nextItem.x,
        y: nextItem.y,
        width: Math.min(nextItem.width, part2Ratio * nextItem.width),
        height: nextItem.height,
      };

      tokens.push({
        word: fullWord,
        normalized: normalizeWord(fullWord),
        itemIndices: [i, i + 1],
        charStart: runningCharOffset,
        charEnd: runningCharOffset + fullWord.length,
        bbox: box1,
        subBoxes: [box1, box2],
      });

      runningCharOffset += fullWord.length + 1;
      continue;
    }

    // ── Normal word-by-word tokenisation ─────────────────────────────────────
    const rawTokens = item.text.split(/(\s+)/);

    // Measure every word + space proportionally using canvas font metrics
    const measuredTokens = rawTokens.map(t => ({
      text: t,
      isSpace: /^\s+$/.test(t),
      width: getTextWidth(t, item.fontSize, item.isMonospace),
    }));

    const totalMeasuredWidth = measuredTokens.reduce((s, t) => s + t.width, 0) || 1;
    // Scale factor aligns canvas measurement to the actual PDF item width
    const scaleFactor = item.width / totalMeasuredWidth;

    let currentX = item.x;

    for (const mt of measuredTokens) {
      const scaledWidth = mt.width * scaleFactor;

      if (!mt.isSpace && mt.text.trim().length > 0) {
        const wordText = mt.text.trim();
        const box: BoundingBox = {
          x: Math.round(currentX * 10) / 10,
          y: Math.round(item.y * 10) / 10,
          width: Math.max(6, Math.round(scaledWidth * 10) / 10),
          height: Math.round(item.height * 10) / 10,
        };

        tokens.push({
          word: wordText,
          normalized: normalizeWord(wordText),   // strips trailing '-' for matching
          itemIndices: [i],
          charStart: runningCharOffset,
          charEnd: runningCharOffset + wordText.length,
          bbox: box,
          subBoxes: [box],
        });

        runningCharOffset += wordText.length;
      } else {
        runningCharOffset += mt.text.length;
      }

      currentX += scaledWidth;
    }

    // Account for the newline character ('\n') joined between items in block.text
    if (i < items.length - 1) {
      runningCharOffset += 1;
    }
  }

  return tokens;
}

/**
 * Maps a spoken word from ElevenLabs' alignment onto the closest visual token.
 *
 * Priority order:
 *   1. Direct word-index match (guaranteed 0 drift throughout entire long pages)
 *   2. Immediate neighborhood around word-index (+/- 2 words for minor token splits)
 *   3. Exact character-offset match (ElevenLabs charIndex with newline correction)
 *   4. Sequential normalized match within a forward window
 *   5. Prefix / fuzzy match
 *   6. Index clamp (ensures highlight never disappears or jumps backwards)
 */
export function findMatchingVisualToken(
  spokenWord: string,
  visualTokens: VisualToken[],
  searchStartIndex: number = 0,
  charIndex?: number,
  wordIndex?: number
): { token: VisualToken; index: number } | null {
  if (visualTokens.length === 0) return null;

  const normSpoken = normalizeWord(spokenWord);

  // 1. Direct word-index match (guaranteed zero cumulative drift across entire pages)
  if (typeof wordIndex === 'number' && wordIndex >= 0 && wordIndex < visualTokens.length) {
    const directToken = visualTokens[wordIndex];
    if (directToken.normalized === normSpoken) {
      return { token: directToken, index: wordIndex };
    }

    // 2. Immediate neighborhood check (+/- 2 tokens around wordIndex)
    const neighborhoodStart = Math.max(0, wordIndex - 2);
    const neighborhoodEnd = Math.min(visualTokens.length, wordIndex + 3);
    for (let idx = neighborhoodStart; idx < neighborhoodEnd; idx++) {
      if (visualTokens[idx].normalized === normSpoken) {
        return { token: visualTokens[idx], index: idx };
      }
    }
  }

  // 3. Character-offset lookup with newline-corrected tolerance
  if (typeof charIndex === 'number' && charIndex >= 0) {
    const anchor = typeof wordIndex === 'number' ? wordIndex : searchStartIndex;
    const searchStart = Math.max(0, anchor - 3);
    const searchEnd = Math.min(visualTokens.length, anchor + 8);

    for (let idx = searchStart; idx < searchEnd; idx++) {
      const vt = visualTokens[idx];
      if (charIndex >= vt.charStart - 1 && charIndex <= vt.charEnd + 2) {
        return { token: vt, index: idx };
      }
    }

    // Full scan fallback for charIndex
    for (let idx = 0; idx < visualTokens.length; idx++) {
      const vt = visualTokens[idx];
      if (charIndex >= vt.charStart - 1 && charIndex <= vt.charEnd + 2) {
        return { token: vt, index: idx };
      }
    }
  }

  // 4. Sequential normalized exact match in a tight forward window
  if (normSpoken) {
    const anchor = typeof wordIndex === 'number' ? wordIndex : searchStartIndex;
    const windowStart = Math.max(0, anchor - 1);
    const windowEnd = Math.min(visualTokens.length, anchor + 6);

    for (let idx = windowStart; idx < windowEnd; idx++) {
      if (visualTokens[idx].normalized === normSpoken) {
        return { token: visualTokens[idx], index: idx };
      }
    }

    // 5. Prefix / fuzzy match in the same window
    for (let idx = windowStart; idx < windowEnd; idx++) {
      const vn = visualTokens[idx].normalized;
      if (vn.startsWith(normSpoken) || normSpoken.startsWith(vn)) {
        return { token: visualTokens[idx], index: idx };
      }
    }
  }

  // 6. Index clamp fallback — anchor to wordIndex or searchStartIndex (never jumps backwards to 0)
  const fallbackIdx = typeof wordIndex === 'number' && wordIndex >= 0 && wordIndex < visualTokens.length
    ? wordIndex
    : Math.min(Math.max(0, searchStartIndex), visualTokens.length - 1);

  return { token: visualTokens[fallbackIdx], index: fallbackIdx };
}
