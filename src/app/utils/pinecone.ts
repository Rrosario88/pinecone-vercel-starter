import { Pinecone, type ScoredPineconeRecord, type Index } from "@pinecone-database/pinecone";

export type Metadata = {
  url: string,
  text: string,
  chunk: string,
  hash: string
}

// Singleton Pinecone client - initialized once, reused across requests
let pineconeClient: Pinecone | null = null;
let pineconeIndex: Index<Metadata> | null = null;
let indexValidated = false;

/**
 * Get or create the singleton Pinecone client.
 * Validates index exists only on first call.
 */
const getPineconeIndex = async (): Promise<Index<Metadata>> => {
  const indexName = process.env.PINECONE_INDEX || '';
  if (indexName === '') {
    throw new Error('PINECONE_INDEX environment variable not set');
  }

  // Return cached index if already validated
  if (pineconeIndex && indexValidated) {
    return pineconeIndex;
  }

  // Initialize client if needed
  if (!pineconeClient) {
    pineconeClient = new Pinecone();
  }

  // Validate index exists (only once)
  if (!indexValidated) {
    const indexes = (await pineconeClient.listIndexes())?.indexes;
    if (!indexes || indexes.filter(i => i.name === indexName).length !== 1) {
      throw new Error(`Index ${indexName} does not exist`);
    }
    indexValidated = true;
  }

  // Cache and return index
  pineconeIndex = pineconeClient.Index<Metadata>(indexName);
  return pineconeIndex;
};

// The function `getMatchesFromEmbeddings` is used to retrieve matches for the given embeddings
const getMatchesFromEmbeddings = async (embeddings: number[], topK: number, namespace: string): Promise<ScoredPineconeRecord<Metadata>[]> => {
  // Get the singleton Pinecone index
  const index = await getPineconeIndex();

  // Get the namespace
  const pineconeNamespace = index.namespace(namespace ?? '')

  try {
    // Query the index with the defined request
    const queryResult = await pineconeNamespace.query({
      vector: embeddings,
      topK,
      includeMetadata: true,
    })
    return queryResult.matches || []
  } catch (e) {
    // Log the error and throw it
    console.log("Error querying embeddings: ", e)
    throw new Error(`Error querying embeddings: ${e}`)
  }
}

export { getMatchesFromEmbeddings }