import { ScoredPineconeRecord } from "@pinecone-database/pinecone";
import { getMatchesFromEmbeddings } from "./pinecone";
import { getEmbeddings } from './embeddings'

export type Metadata = {
  url?: string,
  text: string,
  chunk: string,
  filename?: string,
  pageNumber?: number,
  type?: string,
}

// Enhanced RAG context retrieval with industry best practices
export const getContext = async (
  message: string, 
  namespace: string = '', 
  maxTokens = 4000, 
  minScore = 0.5, // Lowered for better recall
  getOnlyText = true,
  topK = 8 // Increased for better context
): Promise<string | ScoredPineconeRecord[]> => {

  try {
    console.log(`Getting context for query: "${message}"`);
    
    // Get the embeddings of the input message
    const embedding = await getEmbeddings(message);
    console.log(`Generated embedding with ${embedding.length} dimensions`);

    // Retrieve more matches for better context
    const matches = await getMatchesFromEmbeddings(embedding, topK, namespace);
    console.log(`Retrieved ${matches.length} potential matches`);

    // More permissive filtering for better recall
    const qualifyingDocs = matches.filter(m => m.score && m.score > minScore);
    console.log(`${qualifyingDocs.length} docs passed similarity threshold (${minScore})`);

    // Log top matches for debugging
    qualifyingDocs.slice(0, 3).forEach((doc, i) => {
      const metadata = doc.metadata as Metadata;
      console.log(`Match ${i+1}: Score ${doc.score}, Source: ${metadata.filename || metadata.url || 'unknown'}, Page: ${metadata.pageNumber || 'N/A'}`);
    });

    if (!getOnlyText) {
      return qualifyingDocs;
    }

    if (qualifyingDocs.length === 0) {
      console.log("No qualifying documents found");
      return "No relevant information found in the knowledge base.";
    }

    // Enhanced context formatting with source attribution
    let contextParts: string[] = [];
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
    console.log(`Final context: ${finalContext.length} characters, ~${Math.ceil(finalContext.length/4)} tokens`);
    
    return finalContext;
  } catch (error) {
    console.error('Error in getContext:', error);
    return "Error retrieving context from knowledge base.";
  }
}
