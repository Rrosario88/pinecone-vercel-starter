import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone';

export async function POST(request: NextRequest) {
  try {
    const { filename, url, type } = await request.json();
    
    if (!filename && !url) {
      return NextResponse.json({
        success: false,
        error: 'Either filename or url must be provided'
      }, { status: 400 });
    }

    // Instantiate Pinecone client
    const pinecone = new Pinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);

    let deletedCount = 0;
    let namespace = '';

    if (type === 'pdf' && filename) {
      // Delete PDF document from pdf-documents namespace
      namespace = 'pdf-documents';
      const pdfNamespace = index.namespace(namespace);
      
      // First query to get all vectors with this filename
      const queryResponse = await pdfNamespace.query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata filtering
        filter: {
          filename: filename
        },
        topK: 10000, // High number to get all chunks
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        // Extract vector IDs to delete
        const vectorIds = queryResponse.matches.map(match => match.id);
        
        // Delete the vectors
        await pdfNamespace.deleteMany(vectorIds);
        deletedCount = vectorIds.length;
        
        console.log(`Deleted ${deletedCount} PDF chunks for filename: ${filename}`);
      }
    } else if (url) {
      // Delete web document from default namespace
      namespace = '';
      const defaultNamespace = index.namespace(namespace);
      
      // First query to get all vectors with this URL
      const queryResponse = await defaultNamespace.query({
        vector: new Array(1536).fill(0), // Dummy vector for metadata filtering
        filter: {
          url: url
        },
        topK: 10000, // High number to get all chunks
        includeMetadata: true
      });

      if (queryResponse.matches && queryResponse.matches.length > 0) {
        // Extract vector IDs to delete
        const vectorIds = queryResponse.matches.map(match => match.id);
        
        // Delete the vectors
        await defaultNamespace.deleteMany(vectorIds);
        deletedCount = vectorIds.length;
        
        console.log(`Deleted ${deletedCount} web chunks for URL: ${url}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deletedCount} chunks from ${namespace || 'default'} namespace`,
      deletedCount,
      namespace
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete document from Pinecone'
    }, { status: 500 });
  }
}