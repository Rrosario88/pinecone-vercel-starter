import { NextResponse } from 'next/server';
import { getEmbeddings } from '@/utils/embeddings';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }
    
    console.log('Testing embedding generation...');
    console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
    console.log('Text length:', text.length);
    
    const embedding = await getEmbeddings(text);
    
    return NextResponse.json({
      success: true,
      embeddingLength: embedding.length,
      textLength: text.length,
      firstFewValues: embedding.slice(0, 5)
    });
  } catch (error) {
    console.error('Embedding test error:', error);
    return NextResponse.json({
      error: 'Embedding generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}