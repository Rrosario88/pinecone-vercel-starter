import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Query for all PDF documents
    const pdfNamespace = index.namespace('pdf-documents');
    const pdfQuery = await pdfNamespace.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 10000, // Get all documents
      includeMetadata: true,
      filter: {} // No filter to get everything
    });

    // Query for all web documents
    const webNamespace = index.namespace('');
    const webQuery = await webNamespace.query({
      vector: new Array(1536).fill(0), // Dummy vector
      topK: 10000, // Get all documents
      includeMetadata: true,
      filter: {} // No filter to get everything
    });

    // Count unique PDF documents by filename
    const pdfDocuments = new Set();
    pdfQuery.matches?.forEach(match => {
      if (match.metadata?.filename) {
        pdfDocuments.add(match.metadata.filename);
      }
    });

    // Count unique web documents by URL
    const webDocuments = new Set();
    webQuery.matches?.forEach(match => {
      if (match.metadata?.url) {
        webDocuments.add(match.metadata.url);
      }
    });

    // Get document details
    const pdfDetails = Array.from(pdfDocuments).map(filename => {
      const chunks = pdfQuery.matches?.filter(m => m.metadata?.filename === filename) || [];
      return {
        name: filename,
        type: 'pdf',
        chunks: chunks.length,
        uploadId: chunks[0]?.metadata?.uploadId || 'unknown'
      };
    });

    const webDetails = Array.from(webDocuments).map(url => {
      const chunks = webQuery.matches?.filter(m => m.metadata?.url === url) || [];
      return {
        name: url,
        type: 'web',
        chunks: chunks.length
      };
    });

    return NextResponse.json({
      success: true,
      inventory: {
        pdf: {
          count: pdfDocuments.size,
          totalChunks: pdfQuery.matches?.length || 0,
          documents: pdfDetails
        },
        web: {
          count: webDocuments.size,
          totalChunks: webQuery.matches?.length || 0,
          documents: webDetails
        },
        total: {
          documents: pdfDocuments.size + webDocuments.size,
          chunks: (pdfQuery.matches?.length || 0) + (webQuery.matches?.length || 0)
        }
      }
    });

  } catch (error) {
    console.error('Document inventory error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get document inventory',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}