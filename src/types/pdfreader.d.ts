declare module 'pdfreader' {
  export class PdfReader {
    constructor(options?: any);
    parseBuffer(buffer: Buffer, callback: (err: any, item: any) => void): void;
    // Add other methods if needed based on usage
  }

  // You can define the structure of 'item' more precisely if known
  // interface PdfItem {
  //   text?: string;
  //   // other properties like x, y, w, h, etc.
  // }
}
