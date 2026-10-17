import { PDFBlock, BoundingBox } from '../types/pdf';
import { WordAlignment } from './ttsClient';

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
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/^[^\p{L}\p{N}&#]+|[^\p{L}\p{N}&#]+$/gu, '') // Strip leading/trailing punctuation except & and #
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
    let tokensInItem = 0;

    for (const mt of measuredTokens) {
      const scaledWidth = mt.width * scaleFactor;

      if (!mt.isSpace && mt.text.trim().length > 0) {
        const wordText = mt.text.trim();

        // Edge TTS and speech synthesizers emit WordBoundary events ONLY for spoken
        // lexical items (letters, digits, and spoken symbols like '&').
        // Pure punctuation tokens (e.g. standalone '—', '.', ',', '•') never produce
        // a WordBoundary event. We must advance character offsets and canvas X coordinates,
        // but skip registering phantom visual tokens so the token list matches TTS 1:1.
        const isSpoken = /[\p{L}\p{N}&]/u.test(wordText);

        if (isSpoken) {
          const box: BoundingBox = {
            x: Math.round(currentX * 10) / 10,
            y: Math.round(item.y * 10) / 10,
            width: Math.max(6, Math.round(scaledWidth * 10) / 10),
            height: Math.round(item.height * 10) / 10,
          };

          const prev = tokens.length > 0 ? tokens[tokens.length - 1] : null;
          const prevItem = i > 0 ? items[i - 1] : null;
          const isContinuation =
            tokensInItem === 0 &&
            i > 0 &&
            prev !== null &&
            prevItem !== null &&
            prev.itemIndices.includes(i - 1) &&
            Math.abs(item.y - prevItem.y) <= 4 &&
            item.x - (prevItem.x + prevItem.width) <= 0.8 &&
            !prevItem.text.endsWith(' ') &&
            !item.text.startsWith(' ');

          if (isContinuation && prev) {
            prev.word += wordText;
            prev.normalized = normalizeWord(prev.word);
            if (!prev.itemIndices.includes(i)) {
              prev.itemIndices.push(i);
            }
            prev.charEnd = runningCharOffset + wordText.length;
            prev.subBoxes.push(box);
            const minX = Math.min(prev.bbox.x, box.x);
            const minY = Math.min(prev.bbox.y, box.y);
            const maxX = Math.max(prev.bbox.x + prev.bbox.width, box.x + box.width);
            const maxY = Math.max(prev.bbox.y + prev.bbox.height, box.y + box.height);
            prev.bbox = {
              x: Math.round(minX * 10) / 10,
              y: Math.round(minY * 10) / 10,
              width: Math.round((maxX - minX) * 10) / 10,
              height: Math.round((maxY - minY) * 10) / 10,
            };
          } else {
            tokens.push({
              word: wordText,
              normalized: normalizeWord(wordText),   // strips trailing '-' for matching
              itemIndices: [i],
              charStart: runningCharOffset,
              charEnd: runningCharOffset + wordText.length,
              bbox: box,
              subBoxes: [box],
            });
          }
          tokensInItem++;
        }

        runningCharOffset += wordText.length;
      } else {
        runningCharOffset += mt.text.length;
      }

      currentX += scaledWidth;
    }

    // Account for inter-item spaces / newlines consistent with layoutAnalysis
    if (i < items.length - 1) {
      const nextItem = items[i + 1];
      const isNewLine = Math.abs(nextItem.y - item.y) > 4;
      if (isNewLine) {
        runningCharOffset += 1;
      } else {
        const gap = nextItem.x - (item.x + item.width);
        const hadSpace = item.text.endsWith(' ') || nextItem.text.startsWith(' ');
        if (!hadSpace && gap > 0.8) {
          runningCharOffset += 1;
        }
      }
    }
  }

  return tokens;
}

/**
 * Builds visual tokens directly from the TTS alignment words.
 *
 * This provides 100% mathematical synchronization:
 * Instead of predicting how speech synthesis tokenizes code or text,
 * the TTS engine's emitted words serve as the ground truth. Each word is
 * sequentially located in the block's text items and mapped to its exact
 * bounding box on the PDF canvas.
 */
export function buildVisualTokensFromAlignment(
  block: PDFBlock,
  alignment: WordAlignment[]
): VisualToken[] {
  const items = block.items;
  if (!items || items.length === 0 || !alignment || alignment.length === 0) {
    return buildVisualTokensFromBlock(block);
  }

  const tokens: VisualToken[] = [];
  let currentItemIdx = 0;
  let charOffsetInItem = 0;
  let runningCharOffset = 0;

  for (let aIdx = 0; aIdx < alignment.length; aIdx++) {
    const rawWord = alignment[aIdx].word;
    // Strip surrounding punctuation for searching in PDF items (e.g. '<stdio.h>' or 'argc,')
    const cleanWord = rawWord.replace(/^[^a-zA-Z0-9#*+<]+|[^a-zA-Z0-9#*+>]+$/gu, '');
    const searchWord = cleanWord.length > 0 ? cleanWord : rawWord;
    const searchWordLower = searchWord.toLowerCase();

    let matched = false;

    // Search sequentially in current item and subsequent items
    for (let i = currentItemIdx; i < items.length; i++) {
      const item = items[i];
      const startSearch = i === currentItemIdx ? charOffsetInItem : 0;
      
      // 1. Direct single-item match
      const foundIdx = item.text.toLowerCase().indexOf(searchWordLower, startSearch);
      if (foundIdx !== -1) {
        const totalMeasured = getTextWidth(item.text, item.fontSize, item.isMonospace) || 1;
        const scaleFactor = item.width / totalMeasured;

        const prefix = item.text.slice(0, foundIdx);
        const prefixWidth = getTextWidth(prefix, item.fontSize, item.isMonospace) * scaleFactor;
        const matchedSlice = item.text.slice(foundIdx, foundIdx + searchWord.length);
        const wordWidth = Math.max(6, getTextWidth(matchedSlice, item.fontSize, item.isMonospace) * scaleFactor);

        const box: BoundingBox = {
          x: Math.round((item.x + prefixWidth) * 10) / 10,
          y: Math.round(item.y * 10) / 10,
          width: Math.max(6, Math.round(wordWidth * 10) / 10),
          height: Math.round(item.height * 10) / 10,
        };

        tokens.push({
          word: rawWord,
          normalized: normalizeWord(rawWord),
          itemIndices: [i],
          charStart: runningCharOffset,
          charEnd: runningCharOffset + rawWord.length,
          bbox: box,
          subBoxes: [box],
        });

        currentItemIdx = i;
        charOffsetInItem = foundIdx + searchWord.length;
        runningCharOffset += rawWord.length + 1;
        matched = true;
        break;
      }

      // 2. Multi-item match (e.g. LaTeX small caps "[T]" + "[HE]" or hyphenation "[in-]" + "[structions]")
      const firstCharIdx = item.text.toLowerCase().indexOf(searchWordLower[0], startSearch);
      if (firstCharIdx !== -1) {
        const part1 = item.text.slice(firstCharIdx);
        const isHyphen = part1.endsWith('-');
        const part1Clean = isHyphen ? part1.slice(0, -1) : part1;

        if (part1Clean.length > 0 && searchWordLower.startsWith(part1Clean.toLowerCase())) {
          let needed = searchWordLower.slice(part1Clean.length);
          const spanItems: Array<{ itemIdx: number; start: number; end: number }> = [
            { itemIdx: i, start: firstCharIdx, end: item.text.length },
          ];
          let currIdx = i;

          while (needed.length > 0 && currIdx + 1 < items.length) {
            const prevIt = items[currIdx];
            const nextIt = items[currIdx + 1];

            const sameLine = Math.abs(nextIt.y - prevIt.y) <= 4;
            const gap = nextIt.x - (prevIt.x + prevIt.width);
            const isContinuation =
              (sameLine && gap <= 0.8 && !prevIt.text.endsWith(' ') && !nextIt.text.startsWith(' ')) ||
              (!sameLine && prevIt.text.trim().endsWith('-'));

            if (!isContinuation) break;

            const takeLen = Math.min(needed.length, nextIt.text.trim().length);
            const nextSlice = nextIt.text.slice(0, takeLen);
            if (nextSlice.toLowerCase() === needed.slice(0, takeLen)) {
              spanItems.push({ itemIdx: currIdx + 1, start: 0, end: takeLen });
              needed = needed.slice(takeLen);
              currIdx++;
            } else {
              break;
            }
          }

          if (needed.length === 0) {
            const subBoxes: BoundingBox[] = [];
            for (const span of spanItems) {
              const it = items[span.itemIdx];
              const totalMeasured = getTextWidth(it.text, it.fontSize, it.isMonospace) || 1;
              const scaleFactor = it.width / totalMeasured;
              const prefix = it.text.slice(0, span.start);
              const prefixWidth = getTextWidth(prefix, it.fontSize, it.isMonospace) * scaleFactor;
              const slice = it.text.slice(span.start, span.end);
              const sliceWidth = Math.max(4, getTextWidth(slice, it.fontSize, it.isMonospace) * scaleFactor);

              subBoxes.push({
                x: Math.round((it.x + prefixWidth) * 10) / 10,
                y: Math.round(it.y * 10) / 10,
                width: Math.round(sliceWidth * 10) / 10,
                height: Math.round(it.height * 10) / 10,
              });
            }

            const minX = Math.min(...subBoxes.map(b => b.x));
            const minY = Math.min(...subBoxes.map(b => b.y));
            const maxX = Math.max(...subBoxes.map(b => b.x + b.width));
            const maxY = Math.max(...subBoxes.map(b => b.y + b.height));

            const unionBox: BoundingBox = {
              x: Math.round(minX * 10) / 10,
              y: Math.round(minY * 10) / 10,
              width: Math.max(6, Math.round((maxX - minX) * 10) / 10),
              height: Math.round((maxY - minY) * 10) / 10,
            };

            tokens.push({
              word: rawWord,
              normalized: normalizeWord(rawWord),
              itemIndices: spanItems.map(s => s.itemIdx),
              charStart: runningCharOffset,
              charEnd: runningCharOffset + rawWord.length,
              bbox: unionBox,
              subBoxes,
            });

            const lastSpan = spanItems[spanItems.length - 1];
            currentItemIdx = lastSpan.itemIdx;
            charOffsetInItem = lastSpan.end;
            runningCharOffset += rawWord.length + 1;
            matched = true;
            break;
          }
        }
      }
    }

    if (!matched) {
      // Fallback: attach to current item coordinate
      const item = items[Math.min(currentItemIdx, items.length - 1)];
      const box: BoundingBox = {
        x: Math.round(item.x * 10) / 10,
        y: Math.round(item.y * 10) / 10,
        width: Math.max(6, Math.round(item.width * 10) / 10),
        height: Math.round(item.height * 10) / 10,
      };

      tokens.push({
        word: rawWord,
        normalized: normalizeWord(rawWord),
        itemIndices: [Math.min(currentItemIdx, items.length - 1)],
        charStart: runningCharOffset,
        charEnd: runningCharOffset + rawWord.length,
        bbox: box,
        subBoxes: [box],
      });
      runningCharOffset += rawWord.length + 1;
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
      if (charIndex >= vt.charStart && charIndex <= vt.charEnd) {
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
