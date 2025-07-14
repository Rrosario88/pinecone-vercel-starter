import type { Index, PineconeRecord } from '@pinecone-database/pinecone';

const sliceIntoChunks = <T>(arr: T[], chunkSize: number) => {
  return Array.from({ length: Math.ceil(arr.length / chunkSize) }, (_, i) =>
    arr.slice(i * chunkSize, (i + 1) * chunkSize)
  );
};

export const chunkedUpsert = async (
  index: Index,
  vectors: Array<PineconeRecord>,
  namespace: string,
  chunkSize = 10
) => {
  // Split the vectors into chunks
  const chunks = sliceIntoChunks<PineconeRecord>(vectors, chunkSize);

  try {
    // Upsert each chunk of vectors into the index
    await Promise.allSettled(
      chunks.map(async (chunk) => {
        try {
          console.log(`Upserting chunk of ${chunk.length} vectors to namespace: ${namespace}`);
          await index.namespace(namespace).upsert(chunk);
          console.log(`Successfully upserted chunk of ${chunk.length} vectors`);
        } catch (e) {
          console.error('Error upserting chunk:', e);
          throw e; // Re-throw to surface the error
        }
      })
    );

    return true;
  } catch (e) {
    throw new Error(`Error upserting vectors into index: ${e}`);
  }
};
