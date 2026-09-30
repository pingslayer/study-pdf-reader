import { TextContent, TextItem } from 'pdfjs-dist/types/src/display/api';
import { ExtractedTextItem } from '../types/pdf';

export function isMonospaceFont(fontName: string, fontFamily?: string): boolean {
  if (fontFamily && fontFamily.toLowerCase().includes('monospace')) {
    return true;
  }
  const name = (fontName || '').toLowerCase();
  return (
    name.includes('courier') ||
    name.includes('mono') ||
    name.includes('consolas') ||
    name.includes('menlo') ||
    name.includes('fixed') ||
    name.includes('typewriter')
  );
}

export function extractTextItemsFromContent(
  textContent: TextContent,
  pageNumber: number,
  pageHeight: number
): ExtractedTextItem[] {
  const items: ExtractedTextItem[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const raw = textContent.items[i] as TextItem;
    if (!raw.str || raw.str.trim().length === 0) {
      continue;
    }

    const transform = raw.transform; // [scaleX, skewY, skewX, scaleY, tx, ty]
    const tx = transform[4];
    const ty = transform[5];

    // Compute font size from transformation matrix
    const fontSize = Math.hypot(transform[2], transform[3]) || raw.height || 10;
    const height = raw.height > 0 ? raw.height : fontSize;

    // Convert from PDF coordinates (origin at bottom-left) to browser coordinates (origin at top-left)
    const baselineY = pageHeight - ty;
    const y = baselineY - fontSize;
    const x = tx;
    const width = raw.width > 0 ? raw.width : (fontSize * 0.6 * raw.str.length);

    const fontStyle = textContent.styles ? textContent.styles[raw.fontName] : undefined;
    const isMono = isMonospaceFont(raw.fontName, fontStyle?.fontFamily);

    items.push({
      id: `p${pageNumber}-i${i}`,
      page: pageNumber,
      text: raw.str,
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      width: Math.round(width * 100) / 100,
      height: Math.round(height * 100) / 100,
      fontSize: Math.round(fontSize * 10) / 10,
      fontName: raw.fontName,
      isMonospace: isMono,
      blockId: '', // Will be assigned during layout analysis
    });
  }

  return items;
}
