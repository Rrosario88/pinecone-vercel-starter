import { Document, MarkdownTextSplitter, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "@/utils/embeddings";
import { Pinecone, PineconeRecord, ServerlessSpecCloudEnum } from "@pinecone-database/pinecone";
import { chunkedUpsert } from './chunkedUpsert';
import md5 from "md5";
import { truncateStringByBytes } from "@/utils/truncateString";
import fs from 'fs-extra';

// PDF parsing is handled by types/pdf-parse-fork.d.ts

export interface PDFPage {
  content: string;
  pageNumber: number;
  filename: string;
  filePath: string;
}

interface PDFSeedOptions {
  splittingMethod: string;
  chunkSize: number;
  chunkOverlap: number;
  splitByPages?: boolean;
}

type DocumentSplitter = RecursiveCharacterTextSplitter | MarkdownTextSplitter;

export async function extractTextFromPDF(filePath: string, filename: string): Promise<PDFPage[]> {
  try {
    console.log(`Starting PDF extraction for: ${filename}`);
    
    // Dynamic import to avoid build issues
    const pdfParse = (await import('pdf-parse-fork')).default;
    
    const dataBuffer = await fs.readFile(filePath);
    console.log(`Read PDF file: ${dataBuffer.length} bytes`);
    
    const pdfData = await pdfParse(dataBuffer, {
      // Options to improve parsing
      max: 0, // Extract all pages
      version: 'default'
    });
    
    console.log(`PDF parsed successfully: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);
    
    const pages: PDFPage[] = [];
    const totalPages = pdfData.numpages || 1;
    const fullText = pdfData.text || '';
    
    if (fullText.trim().length === 0) {
      // If no text extracted, return a single page with a message
      pages.push({
        content: `No text could be extracted from ${filename}. This might be a scanned PDF or contain only images.`,
        pageNumber: 1,
        filename,
        filePath
      });
      return pages;
    }
    
    // Split text by estimated pages
    if (totalPages === 1) {
      // Single page document
      pages.push({
        content: fullText.trim(),
        pageNumber: 1,
        filename,
        filePath
      });
    } else {
      // Multi-page document - split text roughly by page count
      const textPerPage = Math.ceil(fullText.length / totalPages);
      
      for (let i = 0; i < totalPages; i++) {
        const startIndex = i * textPerPage;
        const endIndex = Math.min((i + 1) * textPerPage, fullText.length);
        const pageContent = fullText.slice(startIndex, endIndex).trim();
        
        if (pageContent.length > 50) { // Only include pages with substantial content
          pages.push({
            content: pageContent,
            pageNumber: i + 1,
            filename,
            filePath
          });
        }
      }
    }
    
    // If no pages were created, create one with all content
    if (pages.length === 0) {
      pages.push({
        content: fullText.trim() || `PDF file ${filename} processed but no readable text found.`,
        pageNumber: 1,
        filename,
        filePath
      });
    }
    
    console.log(`Extracted ${pages.length} pages from PDF`);
    return pages;
  } catch (error) {
    console.error(`Error extracting text from PDF ${filename}:`, error);
    console.error("PDF extraction error details:", {
      filePath,
      filename,
      fileExists: await fs.pathExists(filePath),
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

export async function seedPDF(
  filePath: string, 
  filename: string, 
  indexName: string, 
  cloudName: ServerlessSpecCloudEnum, 
  regionName: string, 
  options: PDFSeedOptions
) {
  try {
    // Initialize the Pinecone client
    const pinecone = new Pinecone();

    // Destructure the options object
    const { splittingMethod, chunkSize, chunkOverlap, splitByPages = true } = options;

    // Extract text from PDF
    const pages = await extractTextFromPDF(filePath, filename);

    // Choose the appropriate document splitter based on the splitting method
    const splitter: DocumentSplitter = splittingMethod === 'recursive' ?
      new RecursiveCharacterTextSplitter({ 
        chunkSize: Math.max(chunkSize, 200), // Ensure minimum viable chunk size
        chunkOverlap: Math.min(chunkOverlap, Math.floor(chunkSize / 2)) // Overlap can't exceed half chunk size
      }) : 
      new MarkdownTextSplitter({
        chunkSize: Math.max(chunkSize, 500), // Markdown needs larger chunks
        chunkOverlap: Math.min(chunkOverlap, Math.floor(chunkSize / 2))
      });

    // Prepare documents by splitting the pages
    const documents = await Promise.all(
      pages.map(page => preparePDFDocument(page, splitter, splitByPages))
    );

    // Create Pinecone index if it does not exist
    const indexList: string[] = (await pinecone.listIndexes())?.indexes?.map(index => index.name) || [];
    const indexExists = indexList.includes(indexName);
    if (!indexExists) {
      await pinecone.createIndex({
        name: indexName,
        dimension: 1536,
        waitUntilReady: true,
        spec: { 
          serverless: { 
              cloud: cloudName, 
              region: regionName
          }
        } 
      });
    }

    const index = pinecone.Index(indexName);

    // Get the vector embeddings for the documents
    const vectors = await Promise.all(documents.flat().map(embedPDFDocument));

    // Use namespace for PDFs to separate from web content
    const namespace = 'pdf-documents';
    await chunkedUpsert(index!, vectors, namespace, 10);

    // Return the documents
    return documents.flat();
  } catch (error) {
    console.error("Error seeding PDF:", error);
    console.error("Seeding error details:", {
      filePath,
      filename,
      indexName,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}

async function embedPDFDocument(doc: Document): Promise<PineconeRecord> {
  try {
    // Validate document content
    if (!doc.pageContent || doc.pageContent.trim().length < 10) {
      throw new Error(`Document content too short: ${doc.pageContent?.length || 0} characters`);
    }

    console.log(`Embedding document: ${doc.pageContent.length} characters`);
    
    // Generate OpenAI embeddings for the document content
    const embedding = await getEmbeddings(doc.pageContent);

    // Create a hash of the document content
    const hash = md5(doc.pageContent);

    // Return the vector embedding object
    return {
      id: hash,
      values: embedding,
      metadata: {
        chunk: doc.pageContent,
        text: doc.metadata.text as string,
        filename: doc.metadata.filename as string,
        pageNumber: doc.metadata.pageNumber as number,
        filePath: doc.metadata.filePath as string,
        hash: doc.metadata.hash as string,
        type: 'pdf'
      }
    } as PineconeRecord;
  } catch (error) {
    console.log("Error embedding PDF document: ", error);
    throw error;
  }
}

async function preparePDFDocument(
  page: PDFPage, 
  splitter: DocumentSplitter,
  splitByPages: boolean
): Promise<Document[]> {
  const pageContent = page.content.trim();

  // Skip empty pages
  if (!pageContent || pageContent.length < 10) {
    console.log(`Skipping empty page ${page.pageNumber} from ${page.filename}`);
    return [];
  }

  if (splitByPages) {
    // Keep each page as a separate document
    return [{
      pageContent,
      metadata: {
        filename: page.filename,
        pageNumber: page.pageNumber,
        filePath: page.filePath,
        text: truncateStringByBytes(pageContent, 36000),
        hash: md5(pageContent)
      },
    }];
  } else {
    try {
      // Split the page content using the provided splitter
      const docs = await splitter.splitDocuments([
        new Document({
          pageContent,
          metadata: {
            filename: page.filename,
            pageNumber: page.pageNumber,
            filePath: page.filePath,
            text: truncateStringByBytes(pageContent, 36000)
          },
        }),
      ]);

      // Filter out very small chunks and add hash to metadata
      return docs
        .filter(doc => doc.pageContent.trim().length >= 10)
        .map((doc: Document) => {
          return {
            pageContent: doc.pageContent.trim(),
            metadata: {
              ...doc.metadata,
              hash: md5(doc.pageContent.trim())
            },
          };
        });
    } catch (error) {
      console.error(`Error splitting document for page ${page.pageNumber}:`, error);
      // Fallback: return the page as a single chunk
      return [{
        pageContent,
        metadata: {
          filename: page.filename,
          pageNumber: page.pageNumber,
          filePath: page.filePath,
          text: truncateStringByBytes(pageContent, 36000),
          hash: md5(pageContent)
        },
      }];
    }
  }
}

export async function deletePDFFile(filePath: string): Promise<void> {
  try {
    await fs.remove(filePath);
  } catch (error) {
    console.error(`Error deleting PDF file ${filePath}:`, error);
    throw error;
  }
}

export async function listUploadedPDFs(uploadsDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(uploadsDir);
    return files.filter(file => file.toLowerCase().endsWith('.pdf'));
  } catch (error) {
    console.error('Error listing uploaded PDFs:', error);
    return [];
  }
}