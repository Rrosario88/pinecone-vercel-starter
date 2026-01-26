import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';

type PdfDocumentDetail = {
  name: string;
  type: 'pdf';
  chunks: number;
  uploadId: string;
};

type WebDocumentDetail = {
  name: string;
  type: 'web';
  chunks: number;
};

type DocumentInventory = {
  pdf: {
    count: number;
    totalChunks: number;
    documents: PdfDocumentDetail[];
  };
  web: {
    count: number;
    totalChunks: number;
    documents: WebDocumentDetail[];
  };
  total: {
    documents: number;
    chunks: number;
  };
};

export function buildDocumentInventory(
  pdfMatches: ScoredPineconeRecord[],
  webMatches: ScoredPineconeRecord[]
): DocumentInventory {
  const pdfDetails: PdfDocumentDetail[] = [];
  const pdfIndex = new Map<string, PdfDocumentDetail>();

  for (const match of pdfMatches) {
    const metadata = match.metadata as { filename?: string; uploadId?: string } | undefined;
    const filename = metadata?.filename;
    if (!filename) continue;

    const existing = pdfIndex.get(filename);
    if (existing) {
      existing.chunks += 1;
    } else {
      const detail: PdfDocumentDetail = {
        name: filename,
        type: 'pdf',
        chunks: 1,
        uploadId: metadata?.uploadId || 'unknown',
      };
      pdfIndex.set(filename, detail);
      pdfDetails.push(detail);
    }
  }

  const webDetails: WebDocumentDetail[] = [];
  const webIndex = new Map<string, WebDocumentDetail>();

  for (const match of webMatches) {
    const metadata = match.metadata as { url?: string } | undefined;
    const url = metadata?.url;
    if (!url) continue;

    const existing = webIndex.get(url);
    if (existing) {
      existing.chunks += 1;
    } else {
      const detail: WebDocumentDetail = {
        name: url,
        type: 'web',
        chunks: 1,
      };
      webIndex.set(url, detail);
      webDetails.push(detail);
    }
  }

  const totalPdfChunks = pdfDetails.reduce((sum, doc) => sum + doc.chunks, 0);
  const totalWebChunks = webDetails.reduce((sum, doc) => sum + doc.chunks, 0);

  return {
    pdf: {
      count: pdfDetails.length,
      totalChunks: totalPdfChunks,
      documents: pdfDetails,
    },
    web: {
      count: webDetails.length,
      totalChunks: totalWebChunks,
      documents: webDetails,
    },
    total: {
      documents: pdfDetails.length + webDetails.length,
      chunks: totalPdfChunks + totalWebChunks,
    },
  };
}

