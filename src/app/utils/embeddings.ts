
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

export async function getEmbeddings(input: string): Promise<number[]> {
  try {
    console.log(`Generating embeddings for text of length: ${input.length}`);
    
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-ada-002'),
      value: input.replace(/\n/g, ' ')
    });

    console.log(`Generated embedding with ${embedding.length} dimensions`);
    return embedding;

  } catch (e) {
    console.error("Error calling OpenAI embedding API:", e);
    throw new Error(`Error calling OpenAI embedding API: ${e}`);
  }
}