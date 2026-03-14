/// <reference types="@cloudflare/workers-types" />

// Module declarations for untyped packages
declare module "pdf-parse" {
  interface PDFInfo {
    Title?: string;
    Subject?: string;
    Author?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    Keywords?: string;
    [key: string]: unknown;
  }

  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: unknown;
    text: string;
    version: string;
  }

  interface PDFOptions {
    max?: number;
    version?: string;
    pagerender?: (pageData: unknown) => string;
  }

  function pdfParse(data: Uint8Array | ArrayBuffer, options?: PDFOptions): Promise<PDFData>;
  export default pdfParse;
}

// Workers runtime extends SubtleCrypto with timingSafeEqual
interface SubtleCrypto {
  timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
}
