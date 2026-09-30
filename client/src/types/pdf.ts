export type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'code' 
  | 'caption' 
  | 'figure' 
  | 'equation' 
  | 'header' 
  | 'footer' 
  | 'list';

export interface ExtractedTextItem {
  id: string;
  page: number;
  text: string;
  // Normalized PDF coordinates (top-left origin in unscaled PDF points)
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  isMonospace: boolean;
  blockId: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PDFBlock {
  id: string;
  page: number;
  type: BlockType;
  text: string;
  items: ExtractedTextItem[];
  bbox: BoundingBox;
  readingOrderIndex: number;
  isFiltered: boolean; // True if skipped according to study settings (e.g. running header)
  headingLevel?: number; // 1, 2, 3
  languageHint?: string; // e.g. 'c', 'python' for code blocks
}

export interface PageLayoutData {
  pageNumber: number;
  width: number; // in unscaled PDF points
  height: number;
  textItems: ExtractedTextItem[];
  blocks: PDFBlock[];
}

export interface StudySettings {
  pauseAtHeading: boolean;
  pauseAtFigure: boolean;
  pauseAtCode: boolean;
  skipCodeBlocks: boolean;
  skipDiagrams: boolean;
  skipPageNumbers: boolean;
  skipHeadersFooters: boolean;
  readCaptions: boolean;
  readEquations: boolean;
  readCodeLiterally: boolean;
}

export interface WordHighlight {
  blockId: string;
  word: string;
  // Screen/rendered coordinates or unscaled PDF coordinates
  bbox: BoundingBox;
  page: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  activePage: number;
  activeBlockId: string | null;
  activeWordIndex: number | null;
  activeHighlight: BoundingBox | null;
  speed: number;
  voiceId: string;
  volume: number;
}
