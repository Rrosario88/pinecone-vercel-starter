import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Check both namespaces
    const defaultNamespace = index.namespace('');
    const pdfNamespace = index.namespace('pdf-documents');
    
    // Get stats for both namespaces
    const [defaultStats, pdfStats] = await Promise.all([
      defaultNamespace.describeIndexStats(),
      pdfNamespace.describeIndexStats()
    ]);
    
    return NextResponse.json({
      indexName: process.env.PINECONE_INDEX,
      defaultNamespace: {
        vectorCount: defaultStats.totalRecordCount || 0,
        stats: defaultStats
      },
      pdfNamespace: {
        vectorCount: pdfStats.totalRecordCount || 0,
        stats: pdfStats
      }
    });
  } catch (error) {
    console.error('Debug index error:', error);
    return NextResponse.json({
      error: 'Failed to get index stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}