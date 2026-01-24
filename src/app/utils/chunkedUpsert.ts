import type { Index, PineconeRecord } from '@pinecone-database/pinecone';

const sliceIntoChunks = <T>(arr: T[], chunkSize: number) => {
  return Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );
};

export interface ChunkedUpsertResult {
  success: boolean;
  totalVectors: number;
  successfulChunks: number;
  failedChunks: number;
  errors: string[];
}

export const chunkedUpsert = async (
  index: Index,
  vectors: Array<PineconeRecord>,
  namespace: string,
  chunkSize = 10
): Promise<ChunkedUpsertResult> => {
  // Split the vectors into chunks
  const chunks = sliceIntoChunks<PineconeRecord>(vectors, chunkSize);

  // Upsert each chunk of vectors into the index
  const results = await Promise.allSettled(
    chunks.map(async (chunk, chunkIndex) => {
      console.log(`Upserting chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} vectors) to namespace: ${namespace}`);
      await index.namespace(namespace).upsert(chunk);
      console.log(`Successfully upserted chunk ${chunkIndex + 1}/${chunks.length}`);
      return chunk.length;
    })
  );

  // Analyze results
  const errors: string[] = [];
  let successfulChunks = 0;
  let successfulVectors = 0;

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      successfulChunks++;
      successfulVectors += result.value;
    } else {
      const errorMsg = result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
      errors.push(`Chunk ${index + 1}: ${errorMsg}`);
      console.error(`Error upserting chunk ${index + 1}:`, result.reason);
    }
  });

  const failedChunks = chunks.length - successfulChunks;

  // If all chunks failed, throw an error
  if (successfulChunks === 0 && chunks.length > 0) {
    throw new Error(`All ${chunks.length} chunks failed to upsert: ${errors.join('; ')}`);
  }

  // If some chunks failed, log a warning but continue
  if (failedChunks > 0) {
    console.warn(`Warning: ${failedChunks}/${chunks.length} chunks failed to upsert`);
  }

  return {
    success: failedChunks === 0,
    totalVectors: vectors.length,
    successfulChunks,
    failedChunks,
    errors
  };
};
