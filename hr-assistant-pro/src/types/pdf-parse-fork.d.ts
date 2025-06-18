declare module 'pdf-parse-fork' {
  interface PDFPage {
    getTextContent: () => Promise<{ items: Array<{ str: string, dir: string, width: number, height: number, transform: number[], fontName: string }> }>;
    getViewport: (options: { scale: number }) => { width: number, height: number };
    render: (options: any) => Promise<void>;
  }

  interface PDFDocument {
    numPages: number;
    getPage: (pageNumber: number) => Promise<PDFPage>;
    destroy: () => Promise<void>;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: any; // You might want to type this more strictly if you use it
    metadata: any; // Same here
    text: string;
    version: string; // e.g., '1.10.100'
  }

  function pdf(dataBuffer: Buffer, options?: any): Promise<PDFData>;
  export default pdf;
}
