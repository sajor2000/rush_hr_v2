declare module 'pdfreader' {
  interface PdfItem {
    text?: string;
    page?: number;
    x?: number;
    y?: number;
    w?: number;
    h?: number;
  }

  export class PdfReader {
    constructor(options?: { debug?: boolean } | null);
    parseBuffer(buffer: Buffer, callback: (err: Error | null, item: PdfItem | null) => void): void;
  }
}
