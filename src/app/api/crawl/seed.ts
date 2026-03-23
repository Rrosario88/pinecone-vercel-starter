import { getEmbeddings } from "@/app/utils/embeddings";
import { Document, MarkdownTextSplitter, RecursiveCharacterTextSplitter } from "@pinecone-database/doc-splitter";
import { Pinecone, PineconeRecord, ServerlessSpecCloudEnum } from "@pinecone-database/pinecone";
import { chunkedUpsert } from '@/app/utils/chunkedUpsert'
import md5 from "md5";
import { Crawler, Page } from "./crawler";
import { truncateStringByBytes } from "@/app/utils/truncateString"
import { PineconeIndexSpecification } from '@/app/utils/PineconeIndexSpecification';

interface SeedOptions {
  splittingMethod: string
  chunkSize: number
  chunkOverlap: number
}

type DocumentSplitter = RecursiveCharacterTextSplitter | MarkdownTextSplitter

async function seed(url: string, limit: number, indexName: string, cloudName: ServerlessSpecCloudEnum, regionName: string, options: SeedOptions) {
  try {
    // Initialize the Pinecone client
    const pinecone = new Pinecone();

    // Destructure the options object
    const { splittingMethod, chunkSize, chunkOverlap } = options;

    // Create a new Crawler with depth 1 and maximum pages as limit
    const crawler = new Crawler(1, limit || 100);

    // Crawl the given URL and get the pages
    const pages = await crawler.crawl(url) as Page[];

    // Choose the appropriate document splitter based on the splitting method
    const splitter: DocumentSplitter = splittingMethod === 'recursive' ?
      new RecursiveCharacterTextSplitter({ chunkSize, chunkOverlap }) : new MarkdownTextSplitter({});

    // Prepare documents by splitting the pages
    const documents = await Promise.all(pages.map(page => prepareDocument(page, splitter)));

    const indexSpecification = new PineconeIndexSpecification({
      indexName,
      cloudName,
      regionName
    });

    // Create Pinecone index if it does not exist
    const indexList: string[] = (await pinecone.listIndexes())?.indexes?.map(index => index.name) || [];
    const indexExists = indexList.includes(indexName);
    if (!indexExists) {
      await pinecone.createIndex(indexSpecification.buildCreateIndexRequest());
    } else {
      const indexDescription = await pinecone.describeIndex(indexName);
      indexSpecification.validateExistingIndex(indexDescription);
    }

    const index = pinecone.Index(indexName)

    // Check for existing content from this URL
    const flatDocuments = documents.flat();
    console.log(`Processing ${flatDocuments.length} documents for URL: ${url}`);
    
    // Check if content from this URL already exists
    try {
      const existingQuery = await index.query({
        vector: new Array(indexSpecification.getEmbeddingDimension()).fill(0), // Dummy vector for metadata filtering
        filter: { url: url },
        topK: 1,
        includeMetadata: true
      });

      if (existingQuery.matches && existingQuery.matches.length > 0) {
        console.log(`URL ${url} already exists in index with ${existingQuery.matches.length} existing chunks`);
        
        // Get existing hashes to avoid re-processing identical content
        const existingHashQuery = await index.query({
          vector: new Array(indexSpecification.getEmbeddingDimension()).fill(0),
          filter: { url: url },
          topK: 10000, // Get all existing chunks for this URL
          includeMetadata: true
        });
        
        const existingHashes = new Set(
          existingHashQuery.matches?.map(match => match.metadata?.hash).filter(Boolean) || []
        );
        
        // Filter out documents that already exist
        const newDocuments = flatDocuments.filter(doc => {
          const hash = md5(doc.pageContent);
          return !existingHashes.has(hash);
        });
        
        if (newDocuments.length === 0) {
          console.log(`All content from ${url} already exists in index. Skipping embedding.`);
          return flatDocuments; // Return existing documents without re-embedding
        }
        
        console.log(`Found ${newDocuments.length} new documents out of ${flatDocuments.length} total for ${url}`);
        
        // Only embed new documents
        const vectors = await Promise.all(newDocuments.map(embedDocument));
        await chunkedUpsert(index!, vectors, '', 10);
        
        return flatDocuments; // Return all documents (existing + new)
      }
    } catch (queryError) {
      console.log(`No existing content found for ${url}, proceeding with full embedding`);
    }

    // Get the vector embeddings for the documents
    const vectors = await Promise.all(flatDocuments.map(embedDocument));

    // Upsert vectors into the Pinecone index
    await chunkedUpsert(index!, vectors, '', 10);

    // Return the first document
    return documents[0];
  } catch (error) {
    console.error("Error seeding:", error);
    throw error;
  }
}

async function embedDocument(doc: Document): Promise<PineconeRecord> {
  try {
    // Generate OpenAI embeddings for the document content
    const embedding = await getEmbeddings(doc.pageContent);

    // Create a hash of the document content
    const hash = md5(doc.pageContent);

    // Return the vector embedding object
    return {
      id: hash, // The ID of the vector is the hash of the document content
      values: embedding, // The vector values are the OpenAI embeddings
      metadata: { // The metadata includes details about the document
        chunk: doc.pageContent, // The chunk of text that the vector represents
        text: doc.metadata.text as string, // The text of the document
        url: doc.metadata.url as string, // The URL where the document was found
        hash: doc.metadata.hash as string // The hash of the document content
      }
    } as PineconeRecord;
  } catch (error) {
    console.log("Error embedding document: ", error)
    throw error
  }
}

async function prepareDocument(page: Page, splitter: DocumentSplitter): Promise<Document[]> {
  // Get the content of the page
  const pageContent = page.content;

  // Split the documents using the provided splitter
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        url: page.url,
        // Truncate the text to a maximum byte length
        text: truncateStringByBytes(pageContent, 36000)
      },
    }),
  ]);

  // Map over the documents and add a hash to their metadata
  return docs.map((doc: Document) => {
    return {
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        // Create a hash of the document content
        hash: md5(doc.pageContent)
      },
    };
  });
}




export default seed;
