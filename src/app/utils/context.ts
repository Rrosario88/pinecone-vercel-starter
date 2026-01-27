import { ScoredPineconeRecord } from "@pinecone-database/pinecone";
import { getMatchesFromEmbeddings } from "./pinecone";
import { getEmbeddings } from './embeddings';
import { logger } from './logger';

export type Metadata = {
  url?: string,
  text: string,
  chunk: string,
  filename?: string,
  pageNumber?: number,
  type?: string,
}

/**
 * Get context from multiple namespaces using a single embedding.
 * More efficient than calling getContext twice for the same message.
 */
export const getContextFromMultipleNamespaces = async (
  message: string,
  namespaces: string[],
  maxTokens = 5000,
  minScore = 0.2,
  topK = 25
): Promise<Record<string, string>> => {
  // Generate embedding ONCE for all namespaces
  logger.debug(`Getting context for query: "${message}" across ${namespaces.length} namespaces`);
  const embedding = await getEmbeddings(message);
  logger.debug(`Generated single embedding with ${embedding.length} dimensions`);

  // Query all namespaces in parallel with the same embedding
  const results = await Promise.all(
    namespaces.map(ns => getContextWithEmbedding(embedding, ns, maxTokens, minScore, true, topK))
  );

  // Return as a record keyed by namespace
  const contextMap: Record<string, string> = {};
  namespaces.forEach((ns, i) => {
    contextMap[ns || 'default'] = results[i] as string;
  });

  return contextMap;
};

/**
 * Get context using a pre-computed embedding vector.
 * Use this when you need to query multiple namespaces with the same embedding.
 */
export const getContextWithEmbedding = async (
  embedding: number[],
  namespace: string = '',
  maxTokens = 5000,
  minScore = 0.2,
  getOnlyText = true,
  topK = 25
): Promise<string | ScoredPineconeRecord[]> => {
  try {
    // Retrieve matches using pre-computed embedding
    const matches = await getMatchesFromEmbeddings(embedding, topK, namespace);
    logger.debug(`Retrieved ${matches.length} potential matches from namespace: ${namespace || 'default'}`);

    return processMatches(matches, minScore, maxTokens, getOnlyText);
  } catch (error) {
    logger.error('Error in getContextWithEmbedding:', error);
    return "Error retrieving context from knowledge base.";
  }
};

// Enhanced RAG context retrieval with industry best practices
export const getContext = async (
  message: string,
  namespace: string = '',
  maxTokens = 5000,
  minScore = 0.2, // Lower threshold for better document discovery
  getOnlyText = true,
  topK = 25 // Higher for better document coverage
): Promise<string | ScoredPineconeRecord[]> => {

  try {
    logger.debug(`Getting context for query: "${message}"`);

    // Get the embeddings of the input message
    const embedding = await getEmbeddings(message);
    logger.debug(`Generated embedding with ${embedding.length} dimensions`);

    // Retrieve more matches for better context
    const matches = await getMatchesFromEmbeddings(embedding, topK, namespace);
    logger.debug(`Retrieved ${matches.length} potential matches`);

    return processMatches(matches, minScore, maxTokens, getOnlyText);
  } catch (error) {
    logger.error('Error in getContext:', error);
    return "Error retrieving context from knowledge base.";
  }
}

/**
 * Process matches into context string or return raw matches.
 * Shared logic used by both getContext and getContextWithEmbedding.
 */
function processMatches(
  matches: ScoredPineconeRecord[],
  minScore: number,
  maxTokens: number,
  getOnlyText: boolean
): string | ScoredPineconeRecord[] {
  // Filter by minimum score threshold (null-safe, handles zero scores correctly)
  const qualifyingDocs = matches.filter(m => m.score != null && m.score >= minScore);
  logger.debug(`${qualifyingDocs.length} docs passed similarity threshold (${minScore})`);

  // Log top matches for debugging
  qualifyingDocs.slice(0, 3).forEach((doc, i) => {
    const metadata = doc.metadata as Metadata;
    logger.debug(`Match ${i+1}: Score ${doc.score}, Source: ${metadata.filename || metadata.url || 'unknown'}, Page: ${metadata.pageNumber || 'N/A'}`);
  });

  if (!getOnlyText) {
    return qualifyingDocs;
  }

  if (qualifyingDocs.length === 0) {
    logger.debug("No qualifying documents found");
    return "No relevant information found in the knowledge base.";
  }

  // Enhanced context formatting with source attribution
  const contextParts: string[] = [];
  let totalTokens = 0;

  for (const match of qualifyingDocs) {
    const metadata = match.metadata as Metadata;
    const chunk = metadata.chunk || '';

    // Create source attribution
    let source = '';
    if (metadata.filename && metadata.pageNumber) {
      source = `[Source: ${metadata.filename}, Page ${metadata.pageNumber}]`;
    } else if (metadata.url) {
      source = `[Source: ${metadata.url}]`;
    } else {
      source = `[Source: Document]`;
    }

    const contextWithSource = `${source}\n${chunk}`;

    // Rough token estimation (4 chars ≈ 1 token)
    const estimatedTokens = contextWithSource.length / 4;

    if (totalTokens + estimatedTokens > maxTokens) {
      break;
    }

    contextParts.push(contextWithSource);
    totalTokens += estimatedTokens;
  }

  const finalContext = contextParts.join('\n\n---\n\n');
  logger.debug(`Final context: ${finalContext.length} characters, ~${Math.ceil(finalContext.length/4)} tokens`);

  return finalContext;
}
