declare module 'pdf-parse-fork' {
  interface PDFData {
    numpages: number;
    text: string;
    info: any;
    metadata: any;
  }
  
  function pdfParse(buffer: Buffer, options?: any): Promise<PDFData>;
  export = pdfParse;
}