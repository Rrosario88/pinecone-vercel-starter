import { NextResponse } from 'next/server';
import { getEmbeddings } from '@/utils/embeddings';
import { getContextWithEmbedding } from '@/utils/context';
import { buildDocumentInventory } from '@/utils/documentInventory';
import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';

export async function GET() {
  try {
    const inventoryQuery = 'document inventory';
    const topK = Number.parseInt(process.env.INVENTORY_TOP_K || '1000', 10);
    const embedding = await getEmbeddings(inventoryQuery);

    const [pdfResults, webResults] = await Promise.all([
      getContextWithEmbedding(embedding, 'pdf-documents', 5000, 0, false, topK),
      getContextWithEmbedding(embedding, '', 5000, 0, false, topK),
    ]);

    if (typeof pdfResults === 'string') {
      throw new Error(pdfResults);
    }
    if (typeof webResults === 'string') {
      throw new Error(webResults);
    }

    const inventory = buildDocumentInventory(
      pdfResults as ScoredPineconeRecord[],
      webResults as ScoredPineconeRecord[]
    );

    return NextResponse.json({
      success: true,
      inventory
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
