import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { logger } from './logger';
import { getEmbeddingModel } from './embeddingConfig';

export async function getEmbeddings(input: string): Promise<number[]> {
  try {
    logger.debug(`Generating embeddings for text of length: ${input.length}`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Embedding request timed out after 30 seconds')), 30000);
    });

    // Race between the embedding request and timeout
    const embeddingModel = getEmbeddingModel();
    const embeddingPromise = embed({
      model: openai.embedding(embeddingModel),
      value: input.replace(/\n/g, ' ')
    });
    
    const { embedding } = await Promise.race([embeddingPromise, timeoutPromise]) as any;

    logger.debug(`Generated embedding with ${embedding.length} dimensions`);
    return embedding;

  } catch (e) {
    logger.error("Error calling OpenAI embedding API:", e);
    throw new Error(`Error calling OpenAI embedding API: ${e}`);
  }
}
