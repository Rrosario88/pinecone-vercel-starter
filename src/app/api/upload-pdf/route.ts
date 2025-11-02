import { NextRequest, NextResponse } from 'next/server';
import { seedPDF } from '@/utils/pdfProcessor';
import { ServerlessSpecCloudEnum } from '@pinecone-database/pinecone';
import path from 'path';
import fs from 'fs-extra';

// Remove edge runtime for file upload support
// export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API called');
    
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    const options = JSON.parse(formData.get('options') as string || '{}');

    console.log('File received:', {
      name: file?.name,
      size: file?.size,
      type: file?.type
    });

    if (!file) {
      console.log('No file in request');
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ success: false, error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({ 
        success: false, 
        error: 'File too large. Maximum size is 50MB.' 
      }, { status: 413 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    await fs.ensureDir(uploadsDir);

    // Save the file
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadsDir, fileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, new Uint8Array(buffer));

    // Validate and set PDF processing options
    const pdfOptions = {
      splittingMethod: options.splittingMethod || 'recursive',
      chunkSize: Math.max(options.chunkSize || 1000, 200), // Minimum 200 chars
      chunkOverlap: Math.min(options.chunkOverlap || 200, (options.chunkSize || 1000) / 2), // Max 50% of chunk size
      splitByPages: options.splitByPages !== false, // Default true
      ...options
    };

    console.log('PDF processing options:', pdfOptions);

    // Process the PDF and seed to Pinecone
    const documents = await seedPDF(
      filePath,
      file.name,
      process.env.PINECONE_INDEX!,
      process.env.PINECONE_CLOUD as ServerlessSpecCloudEnum || 'aws',
      process.env.PINECONE_REGION || 'us-west-2',
      pdfOptions
    );

    return NextResponse.json({ 
      success: true, 
      documents,
      filename: file.name,
      savedAs: fileName,
      chunks: documents.length
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    
    // More detailed error reporting
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Detailed error:', {
      message: errorMessage,
      stack: errorStack,
      error: error
    });
    
    return NextResponse.json({ 
      success: false, 
      error: `Failed to process PDF: ${errorMessage}` 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    
    // Ensure directory exists
    await fs.ensureDir(uploadsDir);
    
    const files = await fs.readdir(uploadsDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    const fileDetails = await Promise.all(
      pdfFiles.map(async (file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          uploadedAt: stats.mtime,
        };
      })
    );

    return NextResponse.json({ 
      success: true, 
      files: fileDetails 
    });

  } catch (error) {
    console.error('Error listing PDFs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to list PDFs' 
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Filename required' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    const filePath = path.join(uploadsDir, filename);

    // Check if file exists
    const exists = await fs.pathExists(filePath);
    if (!exists) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Delete the file
    await fs.remove(filePath);

    return NextResponse.json({ 
      success: true, 
      message: 'File deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting PDF:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete PDF' 
    }, { status: 500 });
  }
}