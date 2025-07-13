import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    console.log('Testing Pinecone connection...');
    console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? 'Set' : 'Missing');
    console.log('PINECONE_INDEX:', process.env.PINECONE_INDEX);
    console.log('PINECONE_CLOUD:', process.env.PINECONE_CLOUD);
    console.log('PINECONE_REGION:', process.env.PINECONE_REGION);
    
    const pinecone = new Pinecone();
    
    // Test basic connection
    const indexList = await pinecone.listIndexes();
    console.log('Available indexes:', indexList);
    
    // Check if our index exists
    const indexExists = indexList.indexes?.some(index => index.name === process.env.PINECONE_INDEX);
    console.log('Our index exists:', indexExists);
    
    if (!indexExists) {
      return NextResponse.json({
        error: 'Index does not exist',
        indexName: process.env.PINECONE_INDEX,
        availableIndexes: indexList.indexes?.map(i => i.name) || []
      });
    }
    
    // Test index access
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    const stats = await index.describeIndexStats();
    
    return NextResponse.json({
      success: true,
      indexName: process.env.PINECONE_INDEX,
      stats,
      environment: {
        cloud: process.env.PINECONE_CLOUD,
        region: process.env.PINECONE_REGION
      }
    });
  } catch (error) {
    console.error('Pinecone test error:', error);
    return NextResponse.json({
      error: 'Pinecone connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}