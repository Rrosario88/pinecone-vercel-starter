import { NextResponse } from "next/server";
import { getContext } from "@/utils/context";
import { Pinecone } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    console.log('=== RAG Connectivity Test ===');
    
    // Test 1: Pinecone Connection
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    
    // Test 2: Check PDF namespace content
    const pdfNamespace = index.namespace('pdf-documents');
    const stats = await pdfNamespace.describeIndexStats();
    
    console.log('PDF Namespace Stats:', stats);
    
    // Test 3: Test query with common terms
    const testQueries = [
      'health',
      'blood',
      'report',
      'test',
      'summary'
    ];
    
    const testResults = [];
    
    for (const query of testQueries) {
      console.log(`\n--- Testing query: "${query}" ---`);
      
      // Get context using our RAG system
      const context = await getContext(
        query,
        'pdf-documents',
        2000,
        0.3, // Very low threshold for testing
        true,
        5
      );
      
      testResults.push({
        query,
        hasResults: context !== "No relevant information found in the knowledge base.",
        contextLength: typeof context === 'string' ? context.length : 0,
        preview: typeof context === 'string' ? context.substring(0, 200) + '...' : 'No context'
      });
    }
    
    // Test 4: Raw Pinecone query
    const rawQuery = await pdfNamespace.query({
      vector: new Array(1536).fill(0.1), // Dummy vector
      topK: 5,
      includeMetadata: true
    });
    
    return NextResponse.json({
      success: true,
      pineconeConnection: 'Connected',
      namespaceStats: stats,
      testResults,
      rawQueryResults: {
        totalMatches: rawQuery.matches?.length || 0,
        sampleMetadata: rawQuery.matches?.[0]?.metadata || null
      },
      diagnosis: {
        pineconeConnected: true,
        dataExists: (rawQuery.matches?.length || 0) > 0,
        ragWorking: testResults.some(r => r.hasResults),
        recommendations: testResults.some(r => r.hasResults) 
          ? ['RAG system appears to be working correctly']
          : [
              'No context retrieved - possible issues:',
              '1. Check if PDFs are properly uploaded and chunked',
              '2. Verify embedding similarity thresholds',
              '3. Check namespace configuration',
              '4. Verify OpenAI API key for embeddings'
            ]
      }
    });

  } catch (error) {
    console.error('RAG Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnosis: {
        pineconeConnected: false,
        dataExists: false,
        ragWorking: false,
        recommendations: [
          'Connection failed - check:',
          '1. PINECONE_API_KEY environment variable',
          '2. PINECONE_INDEX environment variable', 
          '3. Network connectivity to Pinecone',
          '4. Index exists and is ready'
        ]
      }
    }, { status: 500 });
  }
}