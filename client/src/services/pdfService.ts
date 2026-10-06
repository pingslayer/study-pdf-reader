import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { PageLayoutData, ExtractedTextItem } from '../types/pdf';
import { extractTextItemsFromContent } from './textExtraction';
import { analyzePageLayout } from './layoutAnalysis';

// Initialize worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export class PDFService {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private pageLayoutCache: Map<number, PageLayoutData> = new Map();

  public async loadDocument(source: string | ArrayBuffer | Uint8Array): Promise<number> {
    this.pageLayoutCache.clear();
    
    const docInitParams: any = {
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
      enableXfa: false,
    };

    if (typeof source === 'string') {
      docInitParams.url = source;
    } else {
      docInitParams.data = source;
    }

    const loadingTask = pdfjsLib.getDocument(docInitParams);
    this.pdfDoc = await loadingTask.promise;
    return this.pdfDoc.numPages;
  }

  public getNumPages(): number {
    return this.pdfDoc?.numPages || 0;
  }

  private currentRenderTask: any = null;

  public async renderPageToCanvas(
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number
  ): Promise<{ width: number; height: number }> {
    if (!this.pdfDoc) throw new Error('No PDF document loaded');

    // Ensure all font faces registered in the document have resolved
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Cancel previous in-flight canvas render task if user rapidly zoomed or flipped page
    if (this.currentRenderTask) {
      try {
        this.currentRenderTask.cancel();
      } catch {}
      this.currentRenderTask = null;
    }

    const page = await this.pdfDoc.getPage(pageNumber);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: scale * dpr });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2d context from canvas');

    // Explicitly reset transformation matrix to identity before any draw operations
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    const task = page.render(renderContext);
    this.currentRenderTask = task;

    try {
      await task.promise;
    } catch (err: any) {
      if (err?.name === 'RenderingCancelledException') {
        // Ignored: expected cancellation during rapid user interaction
        return {
          width: viewport.width / dpr,
          height: viewport.height / dpr,
        };
      }
      throw err;
    } finally {
      if (this.currentRenderTask === task) {
        this.currentRenderTask = null;
      }
    }

    return {
      width: viewport.width / dpr,
      height: viewport.height / dpr,
    };
  }

  public async getPageLayout(pageNumber: number): Promise<PageLayoutData> {
    if (this.pageLayoutCache.has(pageNumber)) {
      return this.pageLayoutCache.get(pageNumber)!;
    }

    if (!this.pdfDoc) throw new Error('No PDF document loaded');

    const page = await this.pdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 }); // 1.0 scale unscaled PDF points
    const textContent = await page.getTextContent();

    // Extract normalized geometry items
    const textItems: ExtractedTextItem[] = extractTextItemsFromContent(
      textContent,
      pageNumber,
      viewport.height
    );

    // Run layout analysis for reading order and block categorization
    const blocks = analyzePageLayout(textItems, pageNumber, viewport.width, viewport.height);

    const layoutData: PageLayoutData = {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      textItems,
      blocks,
    };

    this.pageLayoutCache.set(pageNumber, layoutData);
    return layoutData;
  }
}

export const pdfService = new PDFService();
