import { NextResponse } from 'next/server';
import { getContext } from '@/utils/context';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }
    
    console.log(`Testing query: "${query}"`);
    
    // Test both namespaces
    const [defaultResults, pdfResults] = await Promise.all([
      getContext(query, '', 4000, 0.3, false, 10),
      getContext(query, 'pdf-documents', 4000, 0.3, false, 10)
    ]);
    
    return NextResponse.json({
      query,
      defaultNamespace: {
        results: Array.isArray(defaultResults) ? defaultResults.length : 0,
        data: defaultResults
      },
      pdfNamespace: {
        results: Array.isArray(pdfResults) ? pdfResults.length : 0,
        data: pdfResults
      }
    });
  } catch (error) {
    console.error('Test query error:', error);
    return NextResponse.json({
      error: 'Query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}