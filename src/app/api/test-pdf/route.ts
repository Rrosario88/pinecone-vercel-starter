import { NextResponse } from 'next/server';
import { extractTextFromPDF } from '@/utils/pdfProcessor';
import path from 'path';
import fs from 'fs-extra';

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    const files = await fs.readdir(uploadsDir);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      return NextResponse.json({ error: 'No PDF files found' });
    }
    
    // Test with the first PDF
    const testFile = pdfFiles[0];
    const filePath = path.join(uploadsDir, testFile);
    
    console.log(`Testing PDF extraction for: ${testFile}`);
    
    const pages = await extractTextFromPDF(filePath, testFile);
    
    return NextResponse.json({
      filename: testFile,
      pages: pages.length,
      firstPageContent: pages[0]?.content.substring(0, 500) + '...',
      allPages: pages.map(p => ({
        pageNumber: p.pageNumber,
        contentLength: p.content.length,
        preview: p.content.substring(0, 100) + '...'
      }))
    });
  } catch (error) {
    console.error('PDF test error:', error);
    return NextResponse.json({
      error: 'PDF test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}