import { NextResponse } from "next/server";
import { Pinecone } from '@pinecone-database/pinecone'

export async function POST() {
  try {
    // Instantiate a new Pinecone client
    const pinecone = new Pinecone();
    // Select the desired index
    const index = pinecone.Index(process.env.PINECONE_INDEX!)

    let clearedPDF = false;
    let clearedDefault = false;

    // Try to clear PDF documents namespace
    try {
      const pdfNamespace = index.namespace('pdf-documents');
      await pdfNamespace.deleteAll();
      console.log('Cleared PDF documents namespace');
      clearedPDF = true;
    } catch (pdfError) {
      console.log('PDF namespace might be empty or not exist:', pdfError);
    }

    // Try to clear default namespace for web crawled content
    try {
      const defaultNamespace = index.namespace('');
      await defaultNamespace.deleteAll();
      console.log('Cleared default namespace');
      clearedDefault = true;
    } catch (defaultError) {
      console.log('Default namespace might be empty or not exist:', defaultError);
    }

    return NextResponse.json({
      success: true,
      message: `Cleared index successfully (PDF: ${clearedPDF}, Default: ${clearedDefault})`
    })
  } catch (error) {
    console.error('Error clearing index:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear index'
    }, { status: 500 })
  }
}
