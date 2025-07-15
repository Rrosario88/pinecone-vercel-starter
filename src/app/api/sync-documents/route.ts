import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Get namespace stats first to see what's actually there
    const [pdfStats, webStats] = await Promise.all([
      index.namespace('pdf-documents').describeIndexStats(),
      index.namespace('').describeIndexStats()
    ]);

    console.log('PDF namespace stats:', pdfStats);
    console.log('Web namespace stats:', webStats);

    // Query for all PDF documents - try multiple approaches
    const pdfNamespace = index.namespace('pdf-documents');
    let pdfQuery;
    
    try {
      // First try with filename filter
      pdfQuery = await pdfNamespace.query({
        vector: new Array(1536).fill(0),
        topK: 10000,
        includeMetadata: true,
        filter: {
          filename: { "$exists": true }
        }
      });
    } catch (error) {
      console.log('Filename filter failed, trying type filter:', error);
      try {
        // Try with type filter
        pdfQuery = await pdfNamespace.query({
          vector: new Array(1536).fill(0),
          topK: 10000,
          includeMetadata: true,
          filter: {
            type: "pdf"
          }
        });
      } catch (error2) {
        console.log('Type filter failed, trying no filter:', error2);
        // Last resort - try to get any records
        pdfQuery = { matches: [] };
      }
    }

    // Query for all web documents
    const webNamespace = index.namespace('');
    let webQuery;
    
    try {
      webQuery = await webNamespace.query({
        vector: new Array(1536).fill(0),
        topK: 10000,
        includeMetadata: true,
        filter: {
          url: { "$exists": true }
        }
      });
    } catch (error) {
      console.log('Web query failed:', error);
      webQuery = { matches: [] };
    }

    // Convert Pinecone matches to document cards format
    const documentCards: any[] = [];

    // Process PDF documents
    pdfQuery.matches?.forEach(match => {
      if (match.metadata) {
        documentCards.push({
          pageContent: match.metadata.chunk || match.metadata.text || '',
          metadata: {
            hash: match.id,
            filename: match.metadata.filename,
            pageNumber: match.metadata.pageNumber,
            type: 'pdf',
            uploadId: match.metadata.uploadId,
            text: match.metadata.text
          }
        });
      }
    });

    // Process web documents
    webQuery.matches?.forEach(match => {
      if (match.metadata) {
        documentCards.push({
          pageContent: match.metadata.chunk || match.metadata.text || '',
          metadata: {
            hash: match.id,
            url: match.metadata.url,
            type: 'web',
            text: match.metadata.text
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      documentCards,
      stats: {
        totalDocuments: documentCards.length,
        pdfChunks: pdfQuery.matches?.length || 0,
        webChunks: webQuery.matches?.length || 0
      }
    });

  } catch (error) {
    console.error('Sync documents error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to sync documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}