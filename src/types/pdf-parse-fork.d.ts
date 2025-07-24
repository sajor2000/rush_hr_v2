declare module 'pdf-parse-fork' {
  interface PDFPage {
    getTextContent: () => Promise<{ items: Array<{ str: string, dir: string, width: number, height: number, transform: number[], fontName: string }> }>;
    getViewport: (options: { scale: number }) => { width: number, height: number };
    render: (options: { canvasContext?: CanvasRenderingContext2D; viewport?: unknown }) => Promise<void>;
  }

  interface _PDFDocument {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPage>;
    destroy: () => Promise<void>;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown> | null;
    text: string;
    version: string; // e.g., '1.10.100'
  }

  interface PDFOptions {
    pagerender?: (pageData: PDFPage) => Promise<string>;
    max?: number;
    version?: string;
  }

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export default pdf;
}
